
import random, string
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q

from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView
from rest_framework.views import APIView, Response, status
from rest_framework.permissions import IsAuthenticated

from .models import Room
from apps.yjs.models import Document
from apps.interviewer.models import InterviewMessage
from apps.executor.models import Submission

from .serializers import RoomSerializer, ViewRoomSerializer, SubmissionSerializer, ChatSerializer
from .permissions import IsHost, IsRoomJoinable

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class CreateRoom(ListCreateAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.filter(Q(host = self.request.user) | Q(participant = self.request.user)).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return RoomSerializer
        return ViewRoomSerializer
    
    def generate_code(self):
        chars = string.ascii_uppercase + string.digits
        while True:
            code = "".join(random.choices(chars, k=6))

            if not Room.objects.filter(code = code).exists():
                return code
            
    def create(self, request, *args, **kwargs):
        curr_rooms = Room.objects.filter((Q(participant = self.request.user) | Q(host = self.request.user)) & (Q(status=Room.Status.WAITING) | Q(status=Room.Status.ACTIVE)))

        if curr_rooms:
            return Response({"message": "Cannot create room when one already exists. Please join or delete this room"}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        room_type = self.request.data.get("testMode")
        

        if(room_type == Room.Mode.PRACTICE):
            room_status = Room.Status.ACTIVE
            serializer.save(host=self.request.user, participant = self.request.user, status=room_status, code=self.generate_code())
        else:
            room_status = Room.Status.WAITING
            serializer.save(host=self.request.user, status=room_status, code=self.generate_code())


class RoomInfo(RetrieveDestroyAPIView):
    queryset = Room.objects.all()
    serializer_class = ViewRoomSerializer
    lookup_field = "code" 


class JoinRoom(APIView):
    permission_classes = [IsAuthenticated, IsRoomJoinable]

    def post(self, request, code):
        curr_rooms = Room.objects.filter((Q(participant = self.request.user) | Q(host = self.request.user)) & (Q(status=Room.Status.WAITING) | Q(status=Room.Status.ACTIVE)))

        if curr_rooms:
            return Response({"message": "Cannot create room when one already exists. Please join or delete this room"}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(Room, code=code)
        self.check_object_permissions(request, room)

        room.participant = request.user
        room.status = Room.Status.ACTIVE
        room.save()

        return Response({"message": "Joined successfully"}, status=status.HTTP_200_OK)


class EndRoom(APIView):
    permission_classes = [IsAuthenticated, IsHost]

    def post(self, request, code):
        room = get_object_or_404(Room, code=code)
        self.check_object_permissions(request, room)
        room.status = Room.Status.ENDED
        room.ended_at = timezone.now()
        room.save()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room.code}",
            {"type": "room.ended"}
        )

        return Response({"message": "Room ended"}, status=status.HTTP_200_OK)
    
    
class GetRoomPlayback(APIView):
    
    def get(self, request, code):
        try:
            room = Room.objects.get(code = code)
            data = {}

            try:
                document = Document.objects.get(room__id = room.id)
                data["timeline"] = document.get_timeline()
            except Document.DoesNotExist:
                data["timeline"] = []

            submission = Submission.objects.filter(room = room).order_by("submitted_at")
            data["submissions"] = SubmissionSerializer(submission, many=True).data
            
            if room.testMode == Room.Mode.PRACTICE:
                chats = InterviewMessage.objects.filter(room__id = room.id).order_by("timestamp")
                data["chats"] = ChatSerializer(chats, many=True).data
            else:
                data["chats"] = []

            return Response(data, status=status.HTTP_200_OK)

            
        except Room.DoesNotExist:
            return Response({"status": "error", "message": "Room does not exist!"}, status=status.HTTP_404_NOT_FOUND)