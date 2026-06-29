import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.rooms.models import Room
from test_utils.factories import UserFactory, ProblemFactory, RoomFactory

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestRoomAPI:
    def test_create_room_practice_mode_happy_path(self, api_client):
        user = UserFactory()
        problem = ProblemFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('create_room')
        response = api_client.post(url, {"problem": problem.id, "testMode": Room.Mode.PRACTICE, "language": Room.Language.PYTHON})
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Room.objects.count() == 1
        room = Room.objects.first()
        assert room.host == user
        assert room.participant == user
        assert room.status == Room.Status.ACTIVE
        assert len(room.code) == 6

    def test_create_room_mock_mode_happy_path(self, api_client):
        user = UserFactory()
        problem = ProblemFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('create_room')
        response = api_client.post(url, {"problem": problem.id, "testMode": Room.Mode.MOCK, "language": Room.Language.PYTHON})
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Room.objects.count() == 1
        room = Room.objects.first()
        assert room.host == user
        assert room.participant is None
        assert room.status == Room.Status.WAITING
        assert len(room.code) == 6

    def test_create_room_already_in_active_room(self, api_client):
        user = UserFactory()
        RoomFactory(host=user, status=Room.Status.ACTIVE)
        
        api_client.force_authenticate(user=user)
        url = reverse('create_room')
        response = api_client.post(url, {"testMode": Room.Mode.PRACTICE})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot create room" in response.data["message"]

    def test_join_room_happy_path(self, api_client):
        host = UserFactory()
        room = RoomFactory(host=host, status=Room.Status.WAITING)
        
        participant = UserFactory()
        api_client.force_authenticate(user=participant)
        
        url = reverse('join_room', kwargs={"code": room.code})
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        room.refresh_from_db()
        assert room.participant == participant
        assert room.status == Room.Status.ACTIVE

    def test_end_room_by_host(self, api_client):
        host = UserFactory()
        room = RoomFactory(host=host, status=Room.Status.ACTIVE)
        
        api_client.force_authenticate(user=host)
        url = reverse('end_room', kwargs={"code": room.code})
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        room.refresh_from_db()
        assert room.status == Room.Status.ENDED

    def test_end_room_by_participant_forbidden(self, api_client):
        host = UserFactory()
        participant = UserFactory()
        room = RoomFactory(host=host, participant=participant, status=Room.Status.ACTIVE)
        
        api_client.force_authenticate(user=participant)
        url = reverse('end_room', kwargs={"code": room.code})
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_room_playback(self, api_client):
        room = RoomFactory(testMode=Room.Mode.PRACTICE)
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('get_room_replay_data', kwargs={"code": room.code})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "timeline" in response.data
        assert "submissions" in response.data
        assert "chats" in response.data

    def test_get_room_info_happy_path(self, api_client):
        room = RoomFactory()
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('room_info', kwargs={"code": room.code})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["code"] == room.code

    def test_delete_room_info_happy_path(self, api_client):
        room = RoomFactory()
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('room_info', kwargs={"code": room.code})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Room.objects.count() == 0

    def test_join_room_already_active_forbidden(self, api_client):
        host = UserFactory()
        participant1 = UserFactory()
        room = RoomFactory(host=host, participant=participant1, status=Room.Status.ACTIVE)
        
        participant2 = UserFactory()
        api_client.force_authenticate(user=participant2)
        
        url = reverse('join_room', kwargs={"code": room.code})
        response = api_client.post(url)
        
        # Should be rejected because room is not joinable
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_join_room_not_found_sad_path(self, api_client):
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('join_room', kwargs={"code": "INVALID"})
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_room_playback_not_found_sad_path(self, api_client):
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('get_room_replay_data', kwargs={"code": "INVALID"})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["status"] == "error"
