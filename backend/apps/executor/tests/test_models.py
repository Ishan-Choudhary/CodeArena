import pytest
from apps.executor.models import Submission
from test_utils.factories import RoomFactory, UserFactory

@pytest.mark.django_db
class TestExecutorModels:
    def test_submission_creation_happy_path(self):
        room = RoomFactory()
        user = UserFactory()
        
        sub = Submission.objects.create(
            room=room,
            user=user,
            code="print('hello')",
        )
        
        assert sub.status == Submission.Status.ERROR # Default status
        assert sub.room == room
        assert sub.user == user
