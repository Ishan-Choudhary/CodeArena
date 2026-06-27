from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from django_cookiejwt.authentication import CookieJWTAuthentication

class CSRFEnforcedCookieJWTAuthentication(CookieJWTAuthentication):
    
    def authenticate(self, request):
        result = super().authenticate(request)
        
        if result is not None:
            self.enforce_csrf(request)
            
        return result

    def enforce_csrf(self, request):
        def dummy_get_response(request):  
            return None

        check = CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        
        if reason:
            raise exceptions.PermissionDenied('CSRF Failed: %s' % reason)
