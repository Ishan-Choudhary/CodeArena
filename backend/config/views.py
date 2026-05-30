from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from rest_framework.views import APIView, Response


@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"message": "CSRF cookie set"})

class Ping(APIView):
    def get(self, request):
        return Response({"status": "ok", "message": "Recieved"})