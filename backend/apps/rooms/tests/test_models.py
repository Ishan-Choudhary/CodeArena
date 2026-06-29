import pytest
from apps.rooms.models import Room
from test_utils.factories import UserFactory, ProblemFactory

@pytest.mark.django_db
class TestRoomModels:
    def test_room_creation_mock_mode(self):
        user = UserFactory()
        problem = ProblemFactory()
        room = Room.objects.create(host=user, problem=problem, testMode=Room.Mode.MOCK)
        
        assert room.host == user
        assert room.participant is None
        assert room.problem == problem
        assert room.testMode == Room.Mode.MOCK
        assert room.status == Room.Status.WAITING

    def test_room_creation_practice_mode(self):
        user = UserFactory()
        problem = ProblemFactory()
        room = Room.objects.create(host=user, participant=user, problem=problem, testMode=Room.Mode.PRACTICE, status=Room.Status.ACTIVE)
        
        assert room.host == user
        assert room.participant == user
        assert room.problem == problem
        assert room.testMode == Room.Mode.PRACTICE
        assert room.status == Room.Status.ACTIVE
