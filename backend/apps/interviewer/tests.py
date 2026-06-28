import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from apps.interviewer.models import InterviewMessage
from apps.interviewer.interviewer import last_n_chat_logs, build_context, call_llm
from test_utils.factories import RoomFactory
from asgiref.sync import sync_to_async

class MockAPIError(Exception):
    def __init__(self, message, code, status=""):
        self.code = code
        self.message = message
        super().__init__(message)
    def __str__(self):
        return self.message

@pytest.mark.django_db
class TestInterviewerModels:
    def test_interview_message_creation_happy_path(self):
        room = RoomFactory()
        msg1 = InterviewMessage.objects.create(room=room, role=InterviewMessage.Role.USER, content="Hello")
        msg2 = InterviewMessage.objects.create(room=room, role=InterviewMessage.Role.ASSISTANT, content="Hi")
        assert msg1.role == "USER"
        assert msg2.role == "ASSISTANT"
        assert msg1.room == room

@pytest.mark.django_db
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
        # Create older message first
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
        assert len(logs) == 3 # injected 'Let's begin', the model msg, injected 'Please evaluate'
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

@pytest.mark.django_db
@pytest.mark.asyncio
class TestInterviewerLLMCall:

    @patch('apps.interviewer.interviewer.get_channel_layer')
    @patch('apps.interviewer.interviewer.genai.Client')
    async def test_call_llm_streaming_happy_path(self, mock_client, mock_get_channel_layer):
        # Mock channel layer
        mock_channel_layer = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        # Mock generator for response_stream
        async def mock_stream():
            class Chunk:
                def __init__(self, t): self.text = t
            yield Chunk("I ")
            yield Chunk("see ")
            yield Chunk("the bug.")

        mock_aio = AsyncMock()
        mock_models = AsyncMock()
        mock_models.generate_content_stream.return_value = mock_stream()
        mock_aio.models = mock_models
        
        # mock async context manager genai.Client().aio
        mock_client_instance = MagicMock()
        mock_client_instance.aio.__aenter__.return_value = mock_aio
        mock_client.return_value = mock_client_instance

        room = await sync_to_async(RoomFactory)()
        await call_llm("prob", "code", "sub", room.id, "group1")

        # 1 start + 3 chunks + 1 end = 5 calls
        assert mock_channel_layer.group_send.call_count == 5
        calls = mock_channel_layer.group_send.call_args_list
        assert calls[0][0][1]["type"] == "chat.stream_start"
        assert calls[1][0][1]["type"] == "chat.stream_chunk"
        assert calls[1][0][1]["text_so_far"] == "I "
        assert calls[2][0][1]["type"] == "chat.stream_chunk"
        assert calls[2][0][1]["text_so_far"] == "I see "
        assert calls[3][0][1]["type"] == "chat.stream_chunk"
        assert calls[3][0][1]["text_so_far"] == "I see the bug."
        assert calls[4][0][1]["type"] == "chat.stream_end"

    @patch('apps.interviewer.interviewer.APIError', MockAPIError)
    @patch('apps.interviewer.interviewer.get_channel_layer')
    @patch('apps.interviewer.interviewer.genai.Client')
    async def test_call_llm_rpd_exhausted_sad_path(self, mock_client, mock_get_channel_layer):
        mock_channel_layer = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        mock_aio = AsyncMock()
        mock_models = AsyncMock()
        # Raise MockAPIError
        mock_models.generate_content_stream.side_effect = MockAPIError("Quota exceeded Requests per day", 429)
        mock_aio.models = mock_models
        
        mock_client_instance = MagicMock()
        mock_client_instance.aio.__aenter__.return_value = mock_aio
        mock_client.return_value = mock_client_instance

        room = await sync_to_async(RoomFactory)()
        await call_llm("prob", "code", "sub", room.id, "group1")

        calls = mock_channel_layer.group_send.call_args_list
        assert calls[-1][0][1]["type"] == "chat.stream_error"
        assert "tomorrow" in calls[-1][0][1]["error_message"]

    @patch('apps.interviewer.interviewer.APIError', MockAPIError)
    @patch('apps.interviewer.interviewer.get_channel_layer')
    @patch('apps.interviewer.interviewer.genai.Client')
    async def test_call_llm_rpm_exhausted_sad_path(self, mock_client, mock_get_channel_layer):
        mock_channel_layer = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        mock_aio = AsyncMock()
        mock_models = AsyncMock()
        # Raise MockAPIError without "per day"
        mock_models.generate_content_stream.side_effect = MockAPIError("Quota exceeded Requests per minute", 429)
        mock_aio.models = mock_models
        
        mock_client_instance = MagicMock()
        mock_client_instance.aio.__aenter__.return_value = mock_aio
        mock_client.return_value = mock_client_instance

        room = await sync_to_async(RoomFactory)()
        await call_llm("prob", "code", "sub", room.id, "group1")

        calls = mock_channel_layer.group_send.call_args_list
        assert calls[-1][0][1]["type"] == "chat.stream_error"
        assert "wait a minute" in calls[-1][0][1]["error_message"]

    @patch('apps.interviewer.interviewer.APIError', MockAPIError)
    @patch('apps.interviewer.interviewer.get_channel_layer')
    @patch('apps.interviewer.interviewer.genai.Client')
    async def test_call_llm_server_overloaded_sad_path(self, mock_client, mock_get_channel_layer):
        mock_channel_layer = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        mock_aio = AsyncMock()
        mock_models = AsyncMock()
        # Raise 503
        mock_models.generate_content_stream.side_effect = MockAPIError("Service unavailable", 503)
        mock_aio.models = mock_models
        
        mock_client_instance = MagicMock()
        mock_client_instance.aio.__aenter__.return_value = mock_aio
        mock_client.return_value = mock_client_instance

        room = await sync_to_async(RoomFactory)()
        await call_llm("prob", "code", "sub", room.id, "group1")

        calls = mock_channel_layer.group_send.call_args_list
        assert calls[-1][0][1]["type"] == "chat.stream_error"
        assert "peak capacity" in calls[-1][0][1]["error_message"]
