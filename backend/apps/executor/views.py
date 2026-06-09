import json
from rest_framework.views import APIView, Response, status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Submission
from .serializers import SubmissionSerializer
from .utils import run_code
from apps.rooms.models import Room

class SubmitView(APIView):

    def post(self, request, code):
        obj = SubmissionSerializer(data=request.data)
        
        if not obj.is_valid():
            return Response(obj.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            roomDetails = get_object_or_404(Room.objects.select_related("problem"), code=code)
            result = json.loads(run_code(roomDetails.problem.test_cases, code=obj.validated_data["code"]))
            err_type = ""

            if "error" in result[0] and "input" not in result[0]:
                err_msg = result[0]["error"]

                if "Host" in result[0]["error"]:
                    return Response({
                        "message": err_msg
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                err_type = Submission.Status.TIMEOUT if result[0].get("is_timeout") else Submission.Status.ERROR
                submission_instance = obj.save(status=err_type, user=request.user, room=roomDetails)
                
                return Response({
                    "status": submission_instance.status,
                    "message": err_msg,
                    "details": result[0].get("details", "")
                }, status=status.HTTP_200_OK)

                
            
            failed_cases = [case for case in result if case["passed"] == False]
            passed_cases = [case for case in result if case["passed"] == True]

            avg_execution_time = -1
            if not failed_cases:
                avg_execution_time = sum(case["execution_ms"] for case in passed_cases)/len(passed_cases)
                submission_instance = obj.save(status=Submission.Status.ACCEPTED, execution_time=avg_execution_time, user=request.user, room=roomDetails)
                
                return Response({
                    "status": submission_instance.status,
                    "execution_time": avg_execution_time
                }, status=status.HTTP_200_OK)
            
            else:
                failed_case = failed_cases[0]
                submission_instance = obj.save(status=Submission.Status.WRONG, stdout=failed_case.get("stdout", ""), user=request.user, room=roomDetails)

                return Response({
                    "status": submission_instance.status,
                    "traceback": failed_case.get("traceback", ""),
                    "stdout": failed_case.get("stdout", ""),
                    "failed_input": failed_case.get("input"),
                    "failed_output": failed_case.get("output"),
                    "expected_output": failed_case.get("expected")
                }, status=status.HTTP_200_OK)


        except Exception as E:
            return Response({"message": "Error processing request"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)