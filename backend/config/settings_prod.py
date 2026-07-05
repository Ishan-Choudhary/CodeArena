from .settings import *
import os

DEBUG = False
allowed_hosts_env = os.environ.get("ALLOWED_HOSTS", "")
ALLOWED_HOSTS = allowed_hosts_env.split(",") if allowed_hosts_env else []

frontend_url = os.environ.get("FRONTEND_URL", "")
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = frontend_url.split(",") if frontend_url else []
CSRF_TRUSTED_ORIGINS = frontend_url.split(",") if frontend_url else []

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

COOKIEJWT_HTTPONLY = True
COOKIEJWT_SECURE = True
COOKIEJWT_SAMESITE = 'Lax'