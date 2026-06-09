import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.rooms.models import Room
from apps.auth_app.models import User

# Create your models here.
class Submission(models.Model):

    class Status(models.TextChoices):
        ACCEPTED = "accepted", _("Accepted")
        WRONG = "wrong_answer", _("Wrong Answer")
        ERROR = "error", _("Error")
        TIMEOUT = "timeout", _("Timeout")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(to=Room, on_delete=models.CASCADE)
    user = models.ForeignKey(to=User, on_delete=models.SET_NULL, null=True)
    code = models.TextField()
    stdout = models.TextField(blank=True)
    stderr = models.TextField(blank=True)
    status = models.CharField(choices=Status, default=Status.ERROR)
    execution_time = models.IntegerField(null = True, blank = True)
    submitted_at = models.DateTimeField(auto_now_add=True)