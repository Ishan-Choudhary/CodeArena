import pytest
import uuid
from apps.problems.models import Problem
from test_utils.factories import ProblemFactory

@pytest.mark.django_db
class TestProblemModel:
    
    def test_create_problem(self):
        # We can use the factory directly!
        problem = ProblemFactory(title="Two Sum", category="hash-table")
        
        # Verify it was saved to the db
        assert Problem.objects.count() == 1
        
        # Verify defaults
        assert problem.difficulty == Problem.Difficulty.EASY
        assert problem.starter_code == {}
        assert problem.test_cases == []
        assert problem.input_types == {}
        assert problem.output_type == {}
        assert problem.order_matters is True
        
        # Verify custom overrides
        assert problem.title == "Two Sum"
        assert problem.category == "hash-table"
        
        # Verify UUID primary key
        assert isinstance(problem.id, uuid.UUID)

    def test_problem_string_representation(self):
        problem = ProblemFactory(title="Valid Palindrome")
        assert str(problem) == "Valid Palindrome"

    def test_difficulty_choices(self):
        problem = ProblemFactory(difficulty=Problem.Difficulty.HARD)
        assert problem.difficulty == "HARD"
