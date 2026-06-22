from django.urls import path
from . import views


urlpatterns = [
    path("docs/<str:room_code>/", views.get_yjs_document),
    path("webhook/", views.save_yjs_document),
]