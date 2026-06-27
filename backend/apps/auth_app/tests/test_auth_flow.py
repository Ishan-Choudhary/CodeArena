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
