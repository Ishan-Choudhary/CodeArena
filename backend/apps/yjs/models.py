import json
import gzip
from django.db import models
from apps.rooms.models import Room

# Create your models here.
class Document(models.Model):
    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name="yjs_document")
    binary_data = models.BinaryField(null=True, blank=True)
    compressed_timeline = models.BinaryField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.room.code
    
    def get_timeline(self):
        if not self.compressed_timeline:
            return []
        
        try:
            unzipped_bytes = gzip.decompress(self.compressed_timeline)
            return json.loads(unzipped_bytes.decode('utf-8'))
        except Exception as e:
            print(f"There was an error decoding timeline: {e}")
            return []
        
    def set_timeline(self, timeline_list):
        try:
            json_str = json.dumps(timeline_list)
            self.compressed_timeline = gzip.compress(json_str.encode("utf-8"))
        except Exception as e:
            print(f"Error compressing timeline {e}")