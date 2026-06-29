import pytest
import asyncio
from asgiref.sync import sync_to_async
import json
from unittest.mock import patch, AsyncMock
from channels.testing import WebsocketCommunicator
from apps.rooms.models import Room
from apps.rooms.consumers import MockModeRoomConsumer, AiRoomConsumer
from test_utils.factories import UserFactory, ProblemFactory, RoomFactory

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
class TestRoomConsumers:

    async def test_mock_mode_consumer_connect_denied(self):
        user = await sync_to_async(UserFactory)()
        room = await sync_to_async(RoomFactory)() # User is neither host nor participant
        
        communicator = WebsocketCommunicator(MockModeRoomConsumer.as_asgi(), f"/ws/room/{room.code}/")
        communicator.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        communicator.scope["user"] = user

        connected, subprotocol = await communicator.connect()
        # Should be denied because user is not host or participant
        assert not connected

    async def test_ai_room_consumer_chat_message(self):
        user = await sync_to_async(UserFactory)()
        problem = await sync_to_async(ProblemFactory)()
        room = await sync_to_async(RoomFactory)(host=user, participant=user, problem=problem, testMode=Room.Mode.PRACTICE)

        communicator = WebsocketCommunicator(AiRoomConsumer.as_asgi(), f"/ws/practice/{room.code}/")
        communicator.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        communicator.scope["user"] = user

        connected, subprotocol = await communicator.connect()
        assert connected

        with patch('apps.rooms.consumers.interviewer.call_llm', new_callable=AsyncMock) as mock_call_llm:
            await communicator.send_json_to({
                "type": "chat.message",
                "data": {
                    "message": "Hello AI",
                    "code": "print(1)"
                }
            })

            # The consumer should broadcast this message back to sender immediately
            response = await communicator.receive_json_from()
            assert response["type"] == "chat.message"
            assert response["message"] == "Hello AI"
            assert response["from"] == "sender"

            # Check that call_llm was triggered
            await asyncio.sleep(0.1)
            mock_call_llm.assert_called_once()
            args = mock_call_llm.call_args[0]
            assert args[0] == problem.description # problem_statement
            assert args[1] == "print(1)" # current_code

        await communicator.disconnect()

    async def test_ai_room_consumer_submission_invalid_code(self):
        user = await sync_to_async(UserFactory)()
        room = await sync_to_async(RoomFactory)(host=user, participant=user, testMode=Room.Mode.PRACTICE)

        communicator = WebsocketCommunicator(AiRoomConsumer.as_asgi(), f"/ws/practice/{room.code}/")
        communicator.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        communicator.scope["user"] = user

        connected, subprotocol = await communicator.connect()
        assert connected

        await communicator.send_json_to({
            "type": "submission.request",
            "data": {
                "code": "" # Invalid empty code
            }
        })

        response = await communicator.receive_json_from()
        assert response["type"] == "submission.result"
        assert response["status"] == "client_error"
        assert "not valid" in response["message"]

        await communicator.disconnect()

    @patch('apps.rooms.consumers.run_code')
    @patch('apps.rooms.consumers.interviewer.call_llm', new_callable=AsyncMock)
    async def test_ai_room_consumer_submission_success(self, mock_call_llm, mock_run_code):
        mock_run_code.return_value = json.dumps([{"passed": True, "execution_ms": 15.5}])

        user = await sync_to_async(UserFactory)()
        problem = await sync_to_async(ProblemFactory)()
        room = await sync_to_async(RoomFactory)(host=user, participant=user, problem=problem, testMode=Room.Mode.PRACTICE)

        communicator = WebsocketCommunicator(AiRoomConsumer.as_asgi(), f"/ws/practice/{room.code}/")
        communicator.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        communicator.scope["user"] = user

        connected, subprotocol = await communicator.connect()
        assert connected

        await communicator.send_json_to({
            "type": "submission.request",
            "data": {
                "code": "def test(): pass"
            }
        })

        response = await communicator.receive_json_from()
        assert response["type"] == "submission.result"
        assert response["status"] == "accepted"
        assert response["execution_time"] == 15.5

        await asyncio.sleep(0.1)
        mock_call_llm.assert_called_once()
        
        await communicator.disconnect()

    async def test_mock_mode_consumer_connect_happy_path(self):
        user = await sync_to_async(UserFactory)()
        room = await sync_to_async(RoomFactory)(host=user, testMode=Room.Mode.MOCK)
        
        communicator = WebsocketCommunicator(MockModeRoomConsumer.as_asgi(), f"/ws/room/{room.code}/")
        communicator.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        communicator.scope["user"] = user

        connected, subprotocol = await communicator.connect()
        assert connected

        # Ping pong test
        await communicator.send_json_to({"type": "ping"})
        response = await communicator.receive_json_from()
        assert response["type"] == "pong"
        
        await communicator.disconnect()

    async def test_ai_room_consumer_double_device_force_disconnect(self):
        user = await sync_to_async(UserFactory)()
        room = await sync_to_async(RoomFactory)(host=user, participant=user, testMode=Room.Mode.PRACTICE)

        # Device 1
        comm1 = WebsocketCommunicator(AiRoomConsumer.as_asgi(), f"/ws/practice/{room.code}/")
        comm1.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        comm1.scope["user"] = user
        connected1, _ = await comm1.connect()
        assert connected1

        # Device 2 logs in as same user
        comm2 = WebsocketCommunicator(AiRoomConsumer.as_asgi(), f"/ws/practice/{room.code}/")
        comm2.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        comm2.scope["user"] = user
        connected2, _ = await comm2.connect()
        assert connected2

        # Device 1 should receive a force_disconnect message
        response = await comm1.receive_json_from()
        assert response["type"] == "error"
        assert "another device" in response["message"]
        
        await comm1.disconnect()
        await comm2.disconnect()

    @patch('apps.rooms.consumers.run_code')
    @patch('apps.rooms.consumers.interviewer.call_llm', new_callable=AsyncMock)
    async def test_ai_room_consumer_submission_wrong_answer(self, mock_call_llm, mock_run_code):
        mock_run_code.return_value = json.dumps([{
            "passed": False, 
            "execution_ms": 10.0, 
            "stdout": "wrong", 
            "expected": "right", 
            "output": "wrong",
            "traceback": ""
        }])

        user = await sync_to_async(UserFactory)()
        problem = await sync_to_async(ProblemFactory)()
        room = await sync_to_async(RoomFactory)(host=user, participant=user, problem=problem, testMode=Room.Mode.PRACTICE)

        communicator = WebsocketCommunicator(AiRoomConsumer.as_asgi(), f"/ws/practice/{room.code}/")
        communicator.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        communicator.scope["user"] = user

        connected, _ = await communicator.connect()
        assert connected

        await communicator.send_json_to({
            "type": "submission.request",
            "data": {
                "code": "def test(): pass"
            }
        })

        response = await communicator.receive_json_from()
        assert response["type"] == "submission.result"
        assert response["status"] == "wrong_answer"
        assert response["expected_output"] == "right"
        assert response["actual_output"] == "wrong"

        await asyncio.sleep(0.1)
        mock_call_llm.assert_called_once()
        
        await communicator.disconnect()

    async def test_mock_mode_consumer_chat_message_sync(self):
        host = await sync_to_async(UserFactory)()
        participant = await sync_to_async(UserFactory)()
        room = await sync_to_async(RoomFactory)(host=host, participant=participant, testMode=Room.Mode.MOCK)

        # Connect Host
        comm_host = WebsocketCommunicator(MockModeRoomConsumer.as_asgi(), f"/ws/room/{room.code}/")
        comm_host.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        comm_host.scope["user"] = host
        connected1, _ = await comm_host.connect()
        assert connected1
        
        # Connect Participant
        comm_part = WebsocketCommunicator(MockModeRoomConsumer.as_asgi(), f"/ws/room/{room.code}/")
        comm_part.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        comm_part.scope["user"] = participant
        connected2, _ = await comm_part.connect()
        assert connected2
        
        # Flush the participant_joined message from participant's own queue
        await comm_part.receive_json_from()

        # Participant joined event sent to host
        msg1 = await comm_host.receive_json_from()
        msg2 = await comm_host.receive_json_from()
        assert msg1["type"] == "participant_joined" or msg1["type"] == "participant.joined"

        # Host sends chat
        await comm_host.send_json_to({"type": "chat.message", "data": {"message": "Hello from host!"}})
        
        # Host receives its own message as 'sender'
        resp_host = await comm_host.receive_json_from()
        assert resp_host["type"] == "chat.message"
        assert resp_host["from"] == "sender"

        # Participant receives it as 'receiver'
        resp_part = await comm_part.receive_json_from()
        assert resp_part["type"] == "chat.message"
        assert resp_part["from"] == "receiver"
        
        await comm_host.disconnect()
        await comm_part.disconnect()

    @patch('apps.rooms.consumers.run_code')
    async def test_mock_mode_consumer_submission_sync(self, mock_run_code):
        mock_run_code.return_value = json.dumps([{"passed": True, "execution_ms": 10.0}])
        
        host = await sync_to_async(UserFactory)()
        participant = await sync_to_async(UserFactory)()
        problem = await sync_to_async(ProblemFactory)()
        room = await sync_to_async(RoomFactory)(host=host, participant=participant, problem=problem, testMode=Room.Mode.MOCK)

        # Connect Host
        comm_host = WebsocketCommunicator(MockModeRoomConsumer.as_asgi(), f"/ws/room/{room.code}/")
        comm_host.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        comm_host.scope["user"] = host
        connected1, _ = await comm_host.connect()
        assert connected1
        
        # Connect Participant
        comm_part = WebsocketCommunicator(MockModeRoomConsumer.as_asgi(), f"/ws/room/{room.code}/")
        comm_part.scope["url_route"] = {"kwargs": {"room_name": room.code}}
        comm_part.scope["user"] = participant
        connected2, _ = await comm_part.connect()
        assert connected2

        # Flush joined events
        await comm_host.receive_json_from()
        await comm_host.receive_json_from()
        await comm_part.receive_json_from()

        # Host submits code
        await comm_host.send_json_to({"type": "submission.request", "data": {"code": "print(1)"}})
        
        # Host should get execution result
        resp_host = await comm_host.receive_json_from()
        assert resp_host["type"] == "submission.result"
        assert resp_host["status"] == "accepted"

        # Participant should just get a loading state (doesn't execute code twice)
        resp_part = await comm_part.receive_json_from()
        assert resp_part["type"] == "submission.loading"
        
        await comm_host.disconnect()
        await comm_part.disconnect()
