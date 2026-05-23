from rest_framework.generics import ListAPIView, RetrieveAPIView

from .models import Problem
from .serializers import ProblemSerializer

class ListProblems(ListAPIView):
    queryset = Problem.objects.all()
    serializer_class = ProblemSerializer

class GetProblem(RetrieveAPIView):
    queryset = Problem.objects.all()
    serializer_class = ProblemSerializer