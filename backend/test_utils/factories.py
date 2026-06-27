import factory

from apps.auth_app.models import User
from apps.problems.models import Problem
from apps.rooms.models import Room

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@gmail.com")
    password = factory.PostGenerationMethodCall("set_password", 'test@1234!')

class ProblemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Problem

    title = factory.Sequence(lambda n: f'Problem {n}')
    difficulty = Problem.Difficulty.EASY
    category = "arrays"
    description = "test description"
    starter_code = {}
    test_cases = []

class RoomFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Room

    problem = factory.SubFactory(ProblemFactory)
    host = factory.SubFactory(UserFactory)
    testMode = Room.Mode.MOCK
    language = Room.Language.PYTHON
    code = factory.Sequence(lambda n: f'ABC{n:03d}')
