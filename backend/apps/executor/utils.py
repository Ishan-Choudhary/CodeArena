def run_code(test_cases, code, order_matters):
    import docker
    import json
    import subprocess

    code_content = f"""import json
import time
import io
import traceback
from contextlib import redirect_stdout

{code}                
order_matters = {order_matters}
test_cases = {test_cases}

results = []
for case in test_cases:
    
        f = io.StringIO()

        with redirect_stdout(f):
            try:
                start_time = time.perf_counter_ns()
                output = main(**case["input"])
                end_time = time.perf_counter_ns()

                user_stdout = f.getvalue()
                execution_time = (end_time - start_time) // 1000000
                results.append({{"input": case["input"], "passed": output == case["expected"] if order_matters else sorted(output) == sorted(case["expected"]), "output": output, "expected": case["expected"], "execution_ms": execution_time, "stdout": user_stdout}})

            except Exception as e:
                user_stdout = f.getvalue()
                error_trace = traceback.format_exc()
                results.append({{"input": case["input"], "passed": False, "error": str(e), "traceback": error_trace, "stdout": user_stdout}})
                break

print(json.dumps(results))
    """

    command = [
        "docker", "run",
        "-i",
        "--rm",
        "--network", "none",
        "--memory", "256m",
        "--cpus", "1.0",
        "--read-only",
        "--user", "1000:1000",
        "--security-opt", "no-new-privileges",
        "--cap-drop", "ALL",
        "--pids-limit", "64",
        "python:3.14-slim",
        "timeout", "5s",
        "python3", "-"
    ]
    
    try:
        result = subprocess.run(command, input=code_content, capture_output=True, text=True, timeout=7)

        if result.returncode == 124:
            return json.dumps([{"error": "Time Limit Exceeded", "is_timeout": True}])
        elif result.returncode != 0:
            return json.dumps([{"error": "Compile/Syntax Error", "details": result.stderr.strip(), "is_timeout": False}])
            
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return json.dumps([{"error": "Host execution timed out", "is_timeout": False}])

