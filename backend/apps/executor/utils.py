def run_code(test_cases, code, order_matters, input_types, output_type):
    import docker
    import json
    import subprocess

    code_content = f"""import json
import time
import io
import traceback
from contextlib import redirect_stdout

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def list_to_linked(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def linked_to_list(node):
    result = []
    while node:
        result.append(node.val)
        node = node.next
    return result

def array_to_tree(arr):
    if not arr:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

def tree_to_array(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result

{code}                
order_matters = {order_matters}
test_cases = {test_cases}
input_types = {input_types}
output_type = {output_type}
results = []
for case in test_cases:
    
        f = io.StringIO()
        converted_input = {{}}

        for key, value in case["input"].items():
            conv_type = input_types.get(key)
            if conv_type == "linked_list":
                converted_input[key] = list_to_linked(value)
            elif conv_type == "binary_tree":
                converted_input[key] = array_to_tree(value)
            else:
                converted_input[key] = value

        with redirect_stdout(f):
            try:
                start_time = time.perf_counter_ns()
                output = main(**converted_input )
                end_time = time.perf_counter_ns()

                user_stdout = f.getvalue()
                execution_time = (end_time - start_time) // 1000000
                if output_type.get("type") == "linked_list":
                    output = linked_to_list(output)
                elif output_type.get("type") == "binary_tree":
                    output = tree_to_array(output)
                
                results.append({{"input": case["input"], "passed": output == case["expected"] if order_matters else sorted(output) == sorted(case["expected"]), "output": output, "expected": case["expected"], "execution_ms": execution_time, "stdout": user_stdout}})

            except Exception as e:
                user_stdout = f.getvalue()
                error_trace = traceback.format_exc()
                results.append({{"input": case["input"], "passed": False, "error": str(e), "traceback": error_trace, "stdout": user_stdout, "expected": case["expected"]}})
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

