from django.db import models
from apps.rooms.models import Room
from django.utils.translation import gettext_lazy as _


# Create your models here.
class InterviewMessage(models.Model):
    class Role(models.TextChoices):

        USER = "USER", _("User")
        ASSISTANT = "ASSISTANT", _("Assistant")

    room = models.ForeignKey(to=Room, on_delete=models.CASCADE)
    role = models.CharField(choices=Role, default=Role.ASSISTANT)
    content = models.TextField(blank=False)
    timestamp = models.DateTimeField(auto_now_add=True)