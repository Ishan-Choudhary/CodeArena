import json
import base64
from django.http import HttpResponse
# from django.conf import settings
from rest_framework.views import APIView, Response, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Room, Document

class YjsWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        data = request.data

        if data.get("event") != "change":
            return Response({"status": "ignored", "message": "Not a change event"}, status=status.HTTP_200_OK)

        room_code = data.get("documentName")
        new_chunks = data.get("new_chunks", [])
        master_state_b64 = data.get("document", {}).get("state", "")

        try:
            room = Room.objects.get(code=room_code)
            document, created = Document.objects.get_or_create(room=room)

        except Room.DoesNotExist:
            return Response({"status": "error", "message": "Room does not exist"}, status=status.HTTP_404_NOT_FOUND)

        if master_state_b64:
            document.binary_data = base64.b64decode(master_state_b64)

        if new_chunks:
            current_timeline = document.get_timeline()
            current_timeline.extend(new_chunks)
            document.set_timeline(current_timeline)

        document.save()

        return Response({"status": "success"}, status=status.HTTP_200_OK)

class YjsDocumentView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, room_code):
        try:
            doc = Document.objects.get(room__code=room_code)
            if doc.binary_data:
                return HttpResponse(doc.binary_data, content_type="application/octet-stream")
            return HttpResponse(status=404)
        except Document.DoesNotExist:
            try:
                room = Room.objects.select_related("problem").get(code=room_code)
                problem = room.problem
                language = room.language.lower()
                starter_code = problem.starter_code.get(language, "")

                response = HttpResponse(starter_code, content_type="text/plain")
                response["x-is-starter-code"] = 'true'
                return response
            
            except Room.DoesNotExist:
                return HttpResponse(status=404)
