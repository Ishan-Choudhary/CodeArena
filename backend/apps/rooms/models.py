import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.problems.models import Problem
from apps.auth_app.models import User

# Create your models here.
class Room(models.Model):
    class Mode(models.TextChoices):
        PRACTICE = "PRACTICE", _("Practice")
        MOCK = "MOCK", _("Mock")

    class Status(models.TextChoices):
        WAITING = "WAITING", _("Waiting")
        ACTIVE = "ACTIVE", _("Active")
        ENDED = "ENDED", _("Ended")

    class Language(models.TextChoices):
        PYTHON = "PYTHON", _("Python")
        JAVASCRIPT = "JAVASCRIPT", _("Javascript")
        JAVA = "JAVA", _("Java")

    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=6, unique=True)
    problem = models.ForeignKey(to=Problem, on_delete=models.SET_NULL, null=True)
    host = models.ForeignKey(to=User, null=True, blank=True, on_delete=models.SET_NULL, related_name = "hosted_rooms")
    participant = models.ForeignKey(to=User, null=True, blank=True, on_delete=models.SET_NULL, related_name = "participated_rooms")
    testMode = models.CharField(choices=Mode, default=Mode.PRACTICE)
    status = models.CharField(choices=Status, default=Status.WAITING)
    language = models.CharField(choices=Language, default=Language.PYTHON)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)