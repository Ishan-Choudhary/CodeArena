from django.db import models

import uuid
from martor.models import MartorField
from django.utils.translation import gettext_lazy as _

# Create your models here.
class Problem(models.Model):

    class Difficulty(models.TextChoices):
        EASY = "EASY", _("EASY")
        MEDIUM = "MEDIUM", _("MEDIUM")
        HARD = "HARD", _("HARD")


    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField(max_length=70)
    description = MartorField()
    difficulty = models.CharField(max_length=6, choices=Difficulty)
    starter_code = models.JSONField(default=dict)
    test_cases = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    category = models.CharField(max_length=100, default="")
    order_matters = models.BooleanField(default=True)
    input_types = models.JSONField(default=dict)
    output_type = models.JSONField(default=dict)
    
    def __str__(self):
        return self.title