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

    def test_document_str_method(self):
        room = RoomFactory(code="TEST01")
        doc = Document.objects.create(room=room)
        assert str(doc) == "TEST01"

    def test_document_get_timeline_corrupted_data(self):
        room = RoomFactory()
        doc = Document.objects.create(room=room)
        
        # Manually inject corrupted gzip data
        doc.compressed_timeline = b"this is not a valid gzip byte string"
        doc.save()
        
        # Should gracefully catch the exception and return []
        assert doc.get_timeline() == []

    def test_document_set_timeline_unserializable_data(self):
        room = RoomFactory()
        doc = Document.objects.create(room=room)
        
        class UnserializableObject:
            pass
            
        # Passing an object that json.dumps cannot serialize
        doc.set_timeline([UnserializableObject()])
        
        # Should gracefully catch the TypeError and leave compressed_timeline as None
        assert doc.compressed_timeline is None
