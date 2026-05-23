from django.urls import path

from .views import ListProblems, GetProblem

urlpatterns = [
    path("", ListProblems.as_view(), name="list_all_problems"),
    path("<uuid:pk>", GetProblem.as_view(), name="get_problem"),
]