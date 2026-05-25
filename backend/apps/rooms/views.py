
import random, string
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework.generics import CreateAPIView, UpdateAPIView, RetrieveAPIView
from rest_framework.views import APIView, Response, status
from .models import Room
from .serializers import RoomSerializer, ViewRoomSerializer
from .permissions import IsHost, IsRoomJoinable

class CreateRoom(CreateAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def generate_code(self):
        chars = string.ascii_uppercase + string.digits
        while True:
            code = "".join(random.choices(chars, k=6))

            if not Room.objects.filter(code = code).exists():
                return code

    def perform_create(self, serializer):
        room_type = self.request.data.get("mode")
        if(room_type == Room.Mode.PRACTICE):
            status = Room.Status.ACTIVE
        else:
            status = Room.Status.WAITING
        serializer.save(host=self.request.user, status=status, code=self.generate_code())

class RoomInfo(RetrieveAPIView):
    queryset = Room.objects.all()
    serializer_class = ViewRoomSerializer
    lookup_field = "code"

class JoinRoom(APIView):
    permission_classes = [IsRoomJoinable]

    def post(self, request, code):
        room = get_object_or_404(Room, code=code)
        self.check_object_permissions(request, room)
        room.participant = request.user
        room.status = Room.Status.ACTIVE
        room.save()

        return Response({"message": "Joined successfully"}, status=status.HTTP_200_OK)

class EndRoom(APIView):
    permission_classes = [IsHost]

    def post(self, request, code):
        room = get_object_or_404(Room, code=code)
        self.check_object_permissions(request, room)
        room.status = Room.Status.ENDED
        room.ended_at = timezone.now()
        room.save()

        return Response({"message": "Room ended"}, status=status.HTTP_200_OK)