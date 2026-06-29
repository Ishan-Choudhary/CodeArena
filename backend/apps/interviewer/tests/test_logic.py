import pytest
from apps.interviewer.models import InterviewMessage
from apps.interviewer.interviewer import last_n_chat_logs, build_context
from test_utils.factories import RoomFactory
from asgiref.sync import sync_to_async

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
class TestInterviewerLogic:

    async def test_last_n_chat_logs_empty_state_edge_case(self):
        room = await sync_to_async(RoomFactory)()
        logs = await last_n_chat_logs(5, room.id)
        assert len(logs) == 1
        assert logs[0]["role"] == "user"
        assert logs[0]["parts"][0]["text"] == "Please evaluate my current code"

    async def test_last_n_chat_logs_consecutive_merge_edge_case(self):
        room = await sync_to_async(RoomFactory)()
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.USER, content="Line 1")
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.USER, content="Line 2")
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.USER, content="Line 3")
        
        logs = await last_n_chat_logs(5, room.id)
        assert len(logs) == 1
        assert logs[0]["role"] == "user"
        assert "Line 1" in logs[0]["parts"][0]["text"]
        assert "Line 2" in logs[0]["parts"][0]["text"]
        assert "Line 3" in logs[0]["parts"][0]["text"]

    async def test_last_n_chat_logs_model_first_edge_case(self):
        room = await sync_to_async(RoomFactory)()
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.ASSISTANT, content="I am model")
        
        logs = await last_n_chat_logs(5, room.id)
        assert len(logs) == 3 
        assert logs[0]["role"] == "user"
        assert logs[0]["parts"][0]["text"] == "Let's begin"
        assert logs[1]["role"] == "model"
        assert logs[1]["parts"][0]["text"] == "I am model"
        assert logs[2]["role"] == "user"
        assert logs[2]["parts"][0]["text"] == "Please evaluate my current code"

    async def test_last_n_chat_logs_model_last_edge_case(self):
        room = await sync_to_async(RoomFactory)()
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.USER, content="Hello")
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.ASSISTANT, content="I am model")
        
        logs = await last_n_chat_logs(5, room.id)
        assert len(logs) == 3
        assert logs[-1]["role"] == "user"
        assert logs[-1]["parts"][0]["text"] == "Please evaluate my current code"

    async def test_last_n_chat_logs_perfect_alternation_happy_path(self):
        room = await sync_to_async(RoomFactory)()
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.USER, content="Hello")
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.ASSISTANT, content="Hi")
        await InterviewMessage.objects.acreate(room=room, role=InterviewMessage.Role.USER, content="Help")
        
        logs = await last_n_chat_logs(5, room.id)
        assert len(logs) == 3
        assert logs[0]["role"] == "user"
        assert logs[0]["parts"][0]["text"] == "Hello"
        assert logs[1]["role"] == "model"
        assert logs[1]["parts"][0]["text"] == "Hi"
        assert logs[2]["role"] == "user"
        assert logs[2]["parts"][0]["text"] == "Help"

    async def test_build_context_system_instruction_rendering(self):
        room = await sync_to_async(RoomFactory)()
        sys, logs = await build_context("PROMPT", "STATEMENT", "CODE", "SUBINFO", room.id)
        assert "PROMPT" in sys
        assert "STATEMENT" in sys
        assert "CODE" in sys
        assert "SUBINFO" in sys
        assert len(logs) == 1
