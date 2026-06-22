import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Room, Document

@csrf_exempt
def save_yjs_document(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            if data.get("event") != "change":
                return JsonResponse({"status": "ignored", "reason": "Not a change event"})

            room_code = data.get("documentName")
            state_hex = data.get("document", {}).get("state")

            if state_hex:
                room_instance = Room.objects.get(code=room_code)
                binary_data = bytes.fromhex(state_hex)

                Document.objects.update_or_create(
                    room=room_instance,
                    defaults={"binary_data": binary_data}
                )

                return JsonResponse({"status": "success"})

        except Room.DoesNotExist:
            return JsonResponse({"status": "room_not_found"}, status=404)
        
        except Exception as  e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
        
def get_yjs_document(request, room_code):
    try:
        doc = Document.objects.get(room__code = room_code)
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
            response["X-is-Starter-Code"] = 'true'
            return response
        
        except Room.DoesNotExist:
            return HttpResponse(status=404)



# def get_yjs_document(request, room_code):
#     try:
#         doc = Document.objects.get(room__code = room_code)
#         if doc.binary_data:
#             return HttpResponse(doc.binary_data, content="application/octet-stream")
        
#         return HttpResponse(status=404)

#     except Document.DoesNotExist:
#         return HttpResponse(status=404)