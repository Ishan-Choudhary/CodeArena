"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from drf_spectacular.views import (
    SpectacularSwaggerView,
    SpectacularAPIView
)

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/jwt/", include("django_cookiejwt.urls")),
    re_path(r"^api/auth/", include("djoser.urls")),
    path("api/csrf/", views.get_csrf_token),
    path("martor/", include("martor.urls")),
    path("api/problems/", include("apps.problems.urls")),
    path("api/rooms/", include("apps.rooms.urls"), name="room-apis"),
    path("api/ping/", views.Ping.as_view()),
]