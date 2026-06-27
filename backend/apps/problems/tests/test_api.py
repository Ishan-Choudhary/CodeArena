import pytest
import uuid
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from test_utils.factories import ProblemFactory, UserFactory

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_client(api_client):
    user = UserFactory()
    api_client.force_authenticate(user=user)
    return api_client

@pytest.mark.django_db
class TestProblemAPI:

    def test_list_problems_authenticated(self, authenticated_client):
        # Create a few problems using our factory
        ProblemFactory.create_batch(3)
        
        url = reverse("list_all_problems")
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Assuming pagination isn't changing the base response structure drastically,
        # but typical DRF lists might be paginated. If paginated, it has a 'results' key.
        data = response.data
        if 'results' in data:
            assert len(data['results']) == 3
        else:
            assert len(data) == 3

    def test_list_problems_unauthenticated(self, api_client):
        url = reverse("list_all_problems")
        response = api_client.get(url)
        
        # Since IsAuthenticated is the default global permission
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_single_problem_authenticated(self, authenticated_client):
        problem = ProblemFactory(title="Specific Problem")
        
        url = reverse("get_problem", kwargs={"pk": problem.id})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Specific Problem"
        assert response.data["id"] == str(problem.id)

    def test_get_single_problem_not_found(self, authenticated_client):
        # Generate a random UUID that definitely doesn't exist
        random_id = uuid.uuid4()
        
        url = reverse("get_problem", kwargs={"pk": random_id})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_problem_serialization_shape(self, authenticated_client):
        # Create a problem with actual JSON data to verify it serializes correctly
        problem = ProblemFactory(
            starter_code={"python": "def solution():\n    pass"},
            test_cases=[{"input": "1", "expected": "2"}],
            input_types={"arg1": "int"},
            output_type={"return": "int"}
        )
        
        url = reverse("get_problem", kwargs={"pk": problem.id})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        
        # Verify JSON fields are returned as dictionaries/lists, not escaped strings
        assert isinstance(data["starter_code"], dict)
        assert data["starter_code"]["python"] == "def solution():\n    pass"
        
        assert isinstance(data["test_cases"], list)
        assert len(data["test_cases"]) == 1
        assert data["test_cases"][0]["expected"] == "2"
        
        assert isinstance(data["input_types"], dict)
        assert isinstance(data["output_type"], dict)

    def test_list_problems_empty_state(self, authenticated_client):
        # Database is empty because each test starts with an empty db
        url = reverse("list_all_problems")
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if 'results' in data:
            assert len(data['results']) == 0
        else:
            assert len(data) == 0

    def test_get_single_problem_invalid_uuid(self, authenticated_client):
        # We can't use reverse() because Django's URL dispatcher will block 
        # generating a URL with a non-UUID parameter for '<uuid:pk>'.
        # So we hit the URL directly to simulate a bad request.
        url = "/api/problems/not-a-real-uuid/"
        response = authenticated_client.get(url)
        
        # Django's URL dispatcher should catch the bad UUID and return 404 Not Found
        assert response.status_code == status.HTTP_404_NOT_FOUND
