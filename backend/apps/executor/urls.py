from django.urls import path
from .views import SubmitView

urlpatterns = [
    path("<str:code>/submit/", SubmitView.as_view(), name="submit_soln")
]