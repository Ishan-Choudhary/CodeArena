from rest_framework.serializers import ModelSerializer
from .models import Submission

class SubmissionSerializer(ModelSerializer):
    class Meta:
        model = Submission
        fields = ["room", "user", "code"]
        read_only_fields = ["user", "room"]