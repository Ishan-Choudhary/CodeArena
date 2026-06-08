import uuid
from django.db import models
from apps.rooms.models import Room
from apps.auth_app.models import User

# Create your models here.
class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # room = models.ForeignKey(to=Room, on_delete=models.CASCADE)
    # user = models.ForeignKey(to=User, on_delete=models.SET_NULL)
    # code = models.TextField()
