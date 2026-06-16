from rest_framework.serializers import ModelSerializer, SlugRelatedField
from .models import Room

class RoomSerializer(ModelSerializer):
    class Meta:
        model = Room
        exclude = ["ended_at", "participant"]
        read_only_fields = ("status", "code")

class ViewRoomSerializer(ModelSerializer):
    host = SlugRelatedField("username", read_only=True)
    participant = SlugRelatedField("username", read_only=True)
    class Meta:
        model = Room
        fields = ["code", "host", "problem", "language", "status", "testMode", "participant"]