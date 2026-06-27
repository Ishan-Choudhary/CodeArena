import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user():
    def make_user(**kwargs):
        kwargs.setdefault('email', 'test@example.com')
        kwargs.setdefault('username', 'testuser')
        kwargs.setdefault('password', 'securepassword123')
        return User.objects.create_user(**kwargs)
    return make_user

@pytest.mark.django_db
class TestAuthFlow:
    
    def test_user_registration(self, api_client):
        # Djoser registration endpoint
        url = "/api/auth/users/" 
        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "strongpassword123",
            "re_password": "strongpassword123"
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="newuser@example.com").exists()
        
    def test_login_returns_cookie(self, api_client, create_user):
        user = create_user()
        
        # django_cookiejwt login endpoint
        url = "/api/jwt/token/"
        data = {
            "email": user.email,
            "password": "securepassword123"
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Assert the cookies contain the token (usually access_token, access, or jwt)
        cookie_keys = response.cookies.keys()
        assert any(key in cookie_keys for key in ['access_token', 'jwt', 'access'])
        
    def test_access_protected_endpoint_with_cookie(self, api_client, create_user):
        user = create_user()
        
        # 1. Login to get the cookie
        login_url = "/api/jwt/token/"
        api_client.post(login_url, {"email": user.email, "password": "securepassword123"}, format='json')
        
        # The APIClient automatically stores cookies from previous responses 
        # so subsequent requests will include them.
        
        # 2. Access protected Djoser endpoint
        me_url = "/api/auth/users/me/"
        response = api_client.get(me_url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email

    def test_access_protected_endpoint_without_cookie_fails(self, api_client):
        me_url = "/api/auth/users/me/"
        response = api_client.get(me_url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout(self, api_client, create_user):
        user = create_user()
        
        # 1. Login
        api_client.post("/api/jwt/token/", {"email": user.email, "password": "securepassword123"}, format='json')
        
        # 2. Logout (Blacklist token)
        logout_url = "/api/jwt/token/blacklist/"
        response = api_client.post(logout_url, format='json')
        
        # The status code for logout varies based on implementation (often 200 or 204)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]
        
        # Verify the cookie is cleared/expired
        cookie_keys = response.cookies.keys()
        token_key = next((key for key in ['access_token', 'jwt', 'access'] if key in cookie_keys), None)
        assert token_key is not None
        
        cookie = response.cookies[token_key]
        assert cookie.value == '' or int(cookie.get('max-age', -1)) == 0 or cookie.get('expires')

    def test_login_invalid_credentials(self, api_client, create_user):
        user = create_user()
        
        url = "/api/jwt/token/"
        data = {
            "email": user.email,
            "password": "wrongpassword123!"
        }
        
        response = api_client.post(url, data, format='json')
        
        # Assert it fails with 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Assert no authentication cookies are returned
        cookie_keys = response.cookies.keys()
        assert not any(key in cookie_keys for key in ['access_token', 'jwt', 'access'])

    def test_login_inactive_user(self, api_client, create_user):
        # Create a user but set them to inactive
        user = create_user(is_active=False)
        
        url = "/api/jwt/token/"
        data = {
            "email": user.email,
            "password": "securepassword123"
        }
        
        response = api_client.post(url, data, format='json')
        
        # Should fail with 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Ensure no cookie is set
        cookie_keys = response.cookies.keys()
        assert not any(key in cookie_keys for key in ['access_token', 'jwt', 'access'])

    def test_csrf_enforcement_on_protected_endpoints(self, create_user):
        # We need a fresh client that explicitly enforces CSRF
        csrf_client = APIClient(enforce_csrf_checks=True)
        user = create_user()
        
        # 1. Login to get the auth cookie
        login_url = "/api/jwt/token/"
        csrf_client.post(login_url, {"email": user.email, "password": "securepassword123"}, format='json')
        
        # 2. Try to hit a POST, PUT, or PATCH endpoint without sending a CSRF token in headers.
        # We will try to update our own username via Djoser's /api/auth/users/me/ endpoint.
        me_url = "/api/auth/users/me/"
        data = {"username": "newusername"}
        response = csrf_client.put(me_url, data, format='json')
        
        # Because we didn't include the X-CSRFToken header, Django's CSRF middleware 
        # should intercept and reject this request with a 403 Forbidden.
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_token_blacklist_enforcement(self, api_client, create_user):
        user = create_user()
        
        # 1. Login to get tokens
        login_url = "/api/jwt/token/"
        response = api_client.post(login_url, {"email": user.email, "password": "securepassword123"}, format='json')
        
        # Extract the refresh token before logging out
        cookie_keys = response.cookies.keys()
        refresh_key = next((key for key in ['refresh_token', 'refresh'] if key in cookie_keys), None)
        assert refresh_key is not None
        stolen_refresh_token = response.cookies[refresh_key].value
        
        # 2. Logout (This blacklists the token in the database)
        logout_url = "/api/jwt/token/blacklist/"
        api_client.post(logout_url, format='json')
        
        # 3. Simulate an attacker trying to use the stolen refresh token
        # We manually inject the stolen token back into the test client's cookies
        api_client.cookies.load({refresh_key: stolen_refresh_token})
        
        # Try to hit the blacklist endpoint again (or refresh endpoint if you had one).
        # Since it's already blacklisted, the server should actively reject it.
        response2 = api_client.post(logout_url, format='json')
        
        # It should return a 400 Bad Request or 401 Unauthorized for a blacklisted token
        assert response2.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]
