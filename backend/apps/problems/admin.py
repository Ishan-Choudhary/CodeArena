from django.contrib import admin
from .models import Problem
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import Widget

class NativeJSONDictWidget(Widget):
    def clean(self, value, row=None, **kwargs):
        if value is None:
            return {}

        if isinstance(value, dict):
            return value

        raise ValueError(f"Expected dict, got {type(value).__name__}")


class NativeJSONListWidget(Widget):
    def clean(self, value, row=None, **kwargs):
        if value is None:
            return []

        if isinstance(value, list):
            return value

        raise ValueError(f"Expected list, got {type(value).__name__}")

class ProblemResources(resources.ModelResource):
    starter_code = fields.Field(column_name="starter_code", attribute="starter_code", widget=NativeJSONDictWidget())
    test_cases = fields.Field(column_name="test_cases", attribute="test_cases", widget=NativeJSONListWidget())
    input_types = fields.Field(column_name="input_types", attribute="input_types", widget=NativeJSONDictWidget())
    output_type = fields.Field(column_name="output_type", attribute="output_type", widget=NativeJSONDictWidget())

    class Meta:
        import_id_fields = ("title",)
        model = Problem
        fields = ("title", "difficulty", "category", "description", "starter_code", "test_cases", "order_matters", "input_types", "output_type" )

        skip_unchanged = True
        report_skipped = True

# Register your models here.
@admin.register(Problem)
class ProblemAdmin(ImportExportModelAdmin):
    resource_classes = [ProblemResources]