import json
import pytest
from apps.executor.utils import run_code

@pytest.mark.integration
class TestExecutorIntegration:

    def test_python_successful_execution(self):
        code = """
def main(a, b):
    print("Calculating...")
    return a + b
"""
        test_cases = [{"input": {"a": 5, "b": 10}, "expected": 15}]
        input_types = {"a": "int", "b": "int"}
        output_type = {"type": "int"}
        
        result_json = run_code(test_cases, code, True, input_types, output_type, "python")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert results[0]["passed"] is True
        assert results[0]["output"] == 15
        assert "Calculating..." in results[0]["stdout"]

    def test_javascript_syntax_error(self):
        code = "function main(a) { return a + ; } // Syntax error here"
        test_cases = [{"input": {"a": 1}, "expected": 2}]
        
        result_json = run_code(test_cases, code, True, {}, {}, "javascript")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert "error" in results[0]
        assert "Compile/Syntax Error" == results[0]["error"]

    def test_python_complex_data_structures(self):
        code = """
def main(head):
    return head
"""
        test_cases = [{"input": {"head": [1, 2, 3]}, "expected": [1, 2, 3]}]
        input_types = {"head": "linked_list"}
        output_type = {"type": "linked_list"}
        
        result_json = run_code(test_cases, code, True, input_types, output_type, "python")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert results[0]["passed"] is True
        assert results[0]["output"] == [1, 2, 3]

    def test_javascript_order_matters_false(self):
        code = """
function main(arr) {
    return arr;
}
"""
        test_cases = [{"input": {"arr": [2, 1]}, "expected": [1, 2]}]
        input_types = {"arr": "list"}
        output_type = {"type": "list"}
        
        result_json = run_code(test_cases, code, False, input_types, output_type, "javascript")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert results[0]["passed"] is True

    def test_time_limit_exceeded(self):
        code = """
def main():
    while True:
        pass
"""
        test_cases = [{"input": {}, "expected": 1}]
        
        result_json = run_code(test_cases, code, True, {}, {}, "python")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert "error" in results[0]
        assert results[0]["error"] == "Time Limit Exceeded"
        assert results[0]["is_timeout"] is True

    def test_javascript_stdout_overflow_protection(self):
        code = """
function main() {
    for (let i = 0; i < 50000; i++) {
        console.log("A");
    }
    return 1;
}
"""
        test_cases = [{"input": {}, "expected": 1}]
        
        result_json = run_code(test_cases, code, True, {}, {}, "javascript")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert results[0]["passed"] is True
        assert "...[Truncated]" in results[0]["stdout"]
        assert len(results[0]["stdout"]) < 15000 

    def test_exception_tracebacks(self):
        code = """
def main():
    raise ValueError("This is a custom runtime error!")
"""
        test_cases = [{"input": {}, "expected": 1}]
        
        result_json = run_code(test_cases, code, True, {}, {}, "python")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert results[0]["passed"] is False
        assert "This is a custom runtime error!" in results[0]["error"]
        assert "traceback" in results[0]

    def test_network_isolation(self):
        code = """
def main():
    import urllib.request
    urllib.request.urlopen("http://google.com", timeout=2)
    return 1
"""
        test_cases = [{"input": {}, "expected": 1}]
        
        result_json = run_code(test_cases, code, True, {}, {}, "python")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert results[0]["passed"] is False
        assert "urlopen error" in results[0]["error"] or "name resolution" in results[0]["error"]

    def test_filesystem_read_only(self):
        code = """
def main():
    with open("/tmp/hacked.txt", "w") as f:
        f.write("hacked")
    return 1
"""
        test_cases = [{"input": {}, "expected": 1}]
        
        result_json = run_code(test_cases, code, True, {}, {}, "python")
        results = json.loads(result_json)
        
        assert len(results) == 1
        assert results[0]["passed"] is False
        assert "Read-only file system" in results[0]["error"] or "Permission denied" in results[0]["error"]
