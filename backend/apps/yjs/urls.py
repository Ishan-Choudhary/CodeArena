from django.urls import path
from . import views


urlpatterns = [
    path("docs/<str:room_code>/", views.YjsDocumentView.as_view(), name="save_document_final_state"),
    path("webhook/", views.YjsWebhookView.as_view(), name="save_timeline_update"),
]