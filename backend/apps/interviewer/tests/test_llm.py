import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from apps.interviewer.interviewer import call_llm
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
@pytest.mark.asyncio
class TestInterviewerLLMCall:

    @patch('apps.interviewer.interviewer.get_channel_layer')
    @patch('apps.interviewer.interviewer.genai.Client')
    async def test_call_llm_streaming_happy_path(self, mock_client, mock_get_channel_layer):
        mock_channel_layer = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer

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
        
        mock_client_instance = MagicMock()
        mock_client_instance.aio.__aenter__.return_value = mock_aio
        mock_client.return_value = mock_client_instance

        room = await sync_to_async(RoomFactory)()
        await call_llm("prob", "code", "sub", room.id, "group1")

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
