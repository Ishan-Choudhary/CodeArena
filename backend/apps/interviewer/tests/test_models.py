import pytest
from apps.interviewer.models import InterviewMessage
from test_utils.factories import RoomFactory

@pytest.mark.django_db
class TestInterviewerModels:
    def test_interview_message_creation_happy_path(self):
        room = RoomFactory()
        msg1 = InterviewMessage.objects.create(room=room, role=InterviewMessage.Role.USER, content="Hello")
        msg2 = InterviewMessage.objects.create(room=room, role=InterviewMessage.Role.ASSISTANT, content="Hi")
        assert msg1.role == "USER"
        assert msg2.role == "ASSISTANT"
        assert msg1.room == room
