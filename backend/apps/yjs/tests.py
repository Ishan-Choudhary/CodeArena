import base64
import json
import gzip
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from test_utils.factories import RoomFactory, ProblemFactory
from apps.yjs.models import Document

@pytest.fixture
def api_client():
    return APIClient()

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
        


@pytest.mark.django_db
class TestYjsWebhookAPI:

    def test_webhook_new_document_happy_path(self, api_client):
        room = RoomFactory(code="ROOM01")
        url = reverse("save_timeline_update")
        
        # Valid base64 state string for a Yjs document (simulated)
        dummy_state = b'fake-binary-state'
        b64_state = base64.b64encode(dummy_state).decode('utf-8')
        
        payload = {
            "event": "change",
            "documentName": "ROOM01",
            "document": {"state": b64_state},
            "new_chunks": [{"data": "chunk1"}]
        }
        
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # Verify document was created and data set
        doc = Document.objects.get(room=room)
        assert doc.binary_data == dummy_state
        assert doc.get_timeline() == [{"data": "chunk1"}]

    def test_webhook_existing_document_append_happy_path(self, api_client):
        room = RoomFactory(code="ROOM02")
        doc = Document.objects.create(room=room, binary_data=b'old-state')
        doc.set_timeline([{"data": "old-chunk"}])
        doc.save()
        
        url = reverse("save_timeline_update")
        payload = {
            "event": "change",
            "documentName": "ROOM02",
            "document": {"state": base64.b64encode(b'new-state').decode('utf-8')},
            "new_chunks": [{"data": "new-chunk"}]
        }
        
        api_client.post(url, payload, format='json')
        
        doc.refresh_from_db()
        # Verify chunks were APPENDED
        assert len(doc.get_timeline()) == 2
        assert doc.get_timeline()[0] == {"data": "old-chunk"}
        assert doc.get_timeline()[1] == {"data": "new-chunk"}
        # State overwritten
        assert doc.binary_data == b'new-state'

    def test_webhook_ignored_event_sad_path(self, api_client):
        url = reverse("save_timeline_update")
        payload = {"event": "connect", "documentName": "ROOM01"}
        
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ignored"
        
    def test_webhook_invalid_room_sad_path(self, api_client):
        url = reverse("save_timeline_update")
        payload = {"event": "change", "documentName": "NONEXI"}
        
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
    def test_webhook_missing_payload_keys_edge_case(self, api_client):
        room = RoomFactory(code="EDGE01")
        url = reverse("save_timeline_update")
        
        # Missing `document` and `new_chunks` entirely
        payload = {
            "event": "change",
            "documentName": "EDGE01"
        }
        
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert Document.objects.filter(room=room).exists()


@pytest.mark.django_db
class TestYjsDocumentAPI:

    def test_get_document_existing_binary_happy_path(self, api_client):
        room = RoomFactory(code="BINDAT")
        Document.objects.create(room=room, binary_data=b'raw-yjs-binary-content')
        
        url = reverse("save_document_final_state", kwargs={"room_code": "BINDAT"})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.content == b'raw-yjs-binary-content'
        assert response['Content-Type'] == "application/octet-stream"

    def test_get_document_fallback_to_starter_code_happy_path(self, api_client):
        # We need a problem with a known language dictionary for starter code
        problem = ProblemFactory(starter_code={"python": "def solution():\n    return 'hello'"})
        room = RoomFactory(code="FALLBK", problem=problem, language="python")
        
        # NO Document exists for this room
        
        url = reverse("save_document_final_state", kwargs={"room_code": "FALLBK"})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.content == b"def solution():\n    return 'hello'"
        assert response['Content-Type'] == "text/plain"
        assert response['x-is-starter-code'] == 'true'

    def test_get_document_missing_room_sad_path(self, api_client):
        url = reverse("save_document_final_state", kwargs={"room_code": "NOHERE"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_document_no_binary_data_sad_path(self, api_client):
        room = RoomFactory(code="NOBIN1")
        # Document exists but binary_data is None
        Document.objects.create(room=room, binary_data=None)
        
        url = reverse("save_document_final_state", kwargs={"room_code": "NOBIN1"})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_document_missing_language_starter_code_edge_case(self, api_client):
        # Problem only has java, but room asks for python
        problem = ProblemFactory(starter_code={"java": "public class Main {}"})
        room = RoomFactory(code="MISLNG", problem=problem, language="python")
        
        url = reverse("save_document_final_state", kwargs={"room_code": "MISLNG"})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # .get('python', '') returns empty string, encoded to bytes
        assert response.content == b""
