from rest_framework.serializers import ModelSerializer, SlugRelatedField
from .models import Room
from apps.executor.models import Submission
from apps.interviewer.models import InterviewMessage

class RoomSerializer(ModelSerializer):
    host = SlugRelatedField("username", read_only=True)
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

class SubmissionSerializer(ModelSerializer):
    class Meta:
        model = Submission
        fields = ["stdout", "status", "execution_time", "submitted_at", "expected_output", "actual_output"]

class ChatSerializer(ModelSerializer):
    class Meta:
        model = InterviewMessage
        fields = ["role", "content", "timestamp"]