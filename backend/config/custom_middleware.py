from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django_cookiejwt.authentication import CookieJWTAuthentication

@database_sync_to_async
def get_user_from_jwt(access_token):
    try:
        authenticator = CookieJWTAuthentication()
        validated_token = authenticator.get_validated_token(access_token.encode("utf-8"))
        user = authenticator.get_user(validated_token)
        return user
    except Exception as e:
        return AnonymousUser()
    
class JWTAuthCookieMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        headers = dict(scope.get("headers", {}))
        cookie_headers = headers.get(b"cookie", b"").decode("utf-8")

        cookies = {}
        if cookie_headers:
            cookies = {
                c.split("=")[0].strip(): c.split("=")[1].strip()
                for c in cookie_headers.split(";") if "=" in c
            }

        access_token = cookies.get("access_token")

        if access_token:
            scope["user"] = await get_user_from_jwt(access_token)
        else:

            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)