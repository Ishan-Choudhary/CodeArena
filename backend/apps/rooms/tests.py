from rest_framework.test import APITestCase, APIClient
from test_utils.factories import UserFactory, ProblemFactory, RoomFactory
from apps.rooms.models import Room

class RoomTests(APITestCase):
    def setUp(self):
        self.host_client = APIClient()
        self.host = UserFactory()
        self.host_client.force_authenticate(user=self.host)
        
        self.participant_client = APIClient()
        self.participant = UserFactory()
        self.participant_client.force_authenticate(user=self.participant)
        
    def test_create_room(self):
        problem = ProblemFactory()
        response = self.host_client.post("/api/rooms/", {"problem": str(problem.id), "mode": Room.Mode.MOCK, "language": Room.Language.PYTHON})
        self.assertEqual(response.status_code, 201)

    def test_intruder_join(self):
        room = RoomFactory(host=self.host, participant = self.participant, status=Room.Status.ACTIVE)
        
        intruder_client = APIClient()
        intruder = UserFactory()
        intruder_client.force_authenticate(user=intruder)

        response = intruder_client.post(f"/api/rooms/{room.code}/join/")
        self.assertEqual(response.status_code, 403)


    def test_join_room(self):
        room = RoomFactory(host=self.host)
        response = self.participant_client.post(f"/api/rooms/{room.code}/join/")
        self.assertEqual(response.status_code, 200)


    def test_end_room(self):
        room = RoomFactory(host=self.host, participant=self.participant, status=Room.Status.ACTIVE, mode=Room.Mode.MOCK)
        response = self.participant_client.post(f"/api/rooms/{room.code}/end/")
        self.assertEqual(response.status_code, 403)

        response = self.host_client.post(f"/api/rooms/{room.code}/end/")
        self.assertEqual(response.status_code, 200)

    def test_host_cannot_join_own_room(self):
        room = RoomFactory(host=self.host)
        response = self.host_client.post(f"/api/rooms/{room.code}/join/")
        self.assertEqual(response.status_code, 403)


    