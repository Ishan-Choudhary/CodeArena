from rest_framework.serializers import ModelSerializer
from .models import Room

class RoomSerializer(ModelSerializer):
    class Meta:
        model = Room
        exclude = ["ended_at", "participant"]
        read_only_fields = ("host", "status", "code")

class ViewRoomSerializer(ModelSerializer):
    class Meta:
        model = Room
        fields = ["code", "host", "problem", "language", "status"]