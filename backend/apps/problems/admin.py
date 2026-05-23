from django.contrib import admin
from django.db import models
from martor.widgets import AdminMartorWidget
from .models import Problem

# Register your models here.
@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):
    pass