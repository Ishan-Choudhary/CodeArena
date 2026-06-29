import pytest
from test_utils.factories import RoomFactory
from apps.yjs.models import Document

@pytest.mark.django_db
class TestYjsModels:
    
    def test_document_timeline_compression_happy_path(self):
        room = RoomFactory()
        doc = Document.objects.create(room=room)
        
        # Test saving timeline
        sample_timeline = [{"client": 1, "clock": 0}, {"client": 1, "clock": 1}]
        doc.set_timeline(sample_timeline)
        doc.save()
        
        # Test retrieving timeline perfectly decodes it
        doc.refresh_from_db()
        assert doc.get_timeline() == sample_timeline
        
    def test_document_timeline_empty_edge_case(self):
        room = RoomFactory()
        doc = Document.objects.create(room=room)
        
        # New document has no compressed timeline
        assert doc.get_timeline() == []
