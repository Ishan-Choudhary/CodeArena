from django.urls import path
from .views import SubmitView

urlpatterns = [
    path("<str:code>/", SubmitView.as_view(), name="submit_soln")
]