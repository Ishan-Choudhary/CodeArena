from django.db import models
from apps.rooms.models import Room

# Create your models here.
class Document(models.Model):
    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name="yjs_document")
    binary_data = models.BinaryField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.room.code