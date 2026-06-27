import pytest
import uuid
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestUserModel:
    
    def test_create_user(self):
        user = User.objects.create_user(email="test@example.com", username="testuser", password="password123")
        
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.check_password("password123") is True
        assert user.is_active is True
        assert user.is_superuser is False
        assert user.is_staff is False
        assert isinstance(user.id, uuid.UUID)

    def test_create_superuser(self):
        admin = User.objects.create_superuser(email="admin@example.com", username="admin", password="password123")
        
        assert admin.is_superuser is True
        assert admin.is_staff is True
        
    def test_email_is_unique(self):
        User.objects.create_user(email="test@example.com", username="testuser1", password="password123")
        
        with pytest.raises(IntegrityError):
            User.objects.create_user(email="test@example.com", username="testuser2", password="password123")

    def test_username_is_required(self):
        # We need to test validation since it's a required field in AbstractUser
        # By default create_user might error out or we might need to call full_clean
        user = User(email="test@example.com", password="password123")
        
        with pytest.raises(ValidationError):
            user.full_clean()
