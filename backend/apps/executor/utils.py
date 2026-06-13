def run_code(test_cases, code, order_matters, input_types, output_type, language):
    import docker
    import json
    import subprocess

    if language == "python":

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
        image = "python:3.14-slim"
        interpreter = ["python3", "-"]

    elif language == "javascript":
        code_content = f"""
{code}

const orderMatters = {json.dumps(order_matters)};
const testCases = {json.dumps(test_cases)};
const inputTypes = {json.dumps(input_types)};
const outputType = {json.dumps(output_type)};

class ListNode {{
    constructor(val, next) {{
        this.val = (val === undefined ? 0 : val);
        this.next = (next === undefined ? null : next);
    }}
}}

class TreeNode {{
    constructor(val, left, right) {{
        this.val = (val === undefined ? 0 : val);
        this.left = (left === undefined ? null : left);
        this.right = (right === undefined ? null : right);
    }}
}}

function listToLinked(arr) {{
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {{
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }}
    return head;
}}

function linkedToList(node) {{
    const result = [];
    while (node) {{
        result.push(node.val);
        node = node.next;
    }}
    return result;
}}

function arrayToTree(arr) {{
    if (!arr || arr.length === 0) return null;
    const root = new TreeNode(arr[0]);
    const queue = [root];
    let i = 1;
    while (queue.length && i < arr.length) {{
        const node = queue.shift();
        if (i < arr.length && arr[i] !== null) {{
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }}
        i++;
        if (i < arr.length && arr[i] !== null) {{
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }}
        i++;
    }}
    return root;
}}

function treeToArray(root) {{
    if (!root) return [];
    const result = [];
    const queue = [root];
    while (queue.length) {{
        const node = queue.shift();
        if (node) {{
            result.push(node.val);
            queue.push(node.left);
            queue.push(node.right);
        }} else {{
            result.push(null);
        }}
    }}
    while (result.length && result[result.length - 1] === null) {{
        result.pop();
    }}
    return result;
}}

// --- BUG FIX: Intercept Console.log ---
let capturedStdout = "";
const originalConsoleLog = console.log;
console.log = function(...args) {{
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ");
    
    // Prevent infinite loops from crashing the container via OOM
    if (capturedStdout.length < 10000) {{
        capturedStdout += msg + "\\n";
    }} else if (!capturedStdout.endsWith("...[Truncated]\\n")) {{
        capturedStdout += "...[Truncated]\\n";
    }}
}};

const results = [];
for (const testCase of testCases) {{
    const convertedInput = {{}};
    for (const [key, value] of Object.entries(testCase.input)) {{
        const convType = inputTypes[key];
        if (convType === "linked_list") {{
            convertedInput[key] = listToLinked(value);
        }} else if (convType === "binary_tree") {{
            convertedInput[key] = arrayToTree(value);
        }} else {{
            convertedInput[key] = value;
        }}
    }}

    // Reset stdout for each test case
    capturedStdout = "";

    try {{
        const start = process.hrtime.bigint();
        // Since you guarantee input JSON matches param order exactly:
        let output = main(...Object.values(convertedInput));
        const end = process.hrtime.bigint();
        const executionMs = Number(end - start) / 1e6;

        if (outputType.type === "linked_list") {{
            output = linkedToList(output);
        }} else if (outputType.type === "binary_tree") {{
            output = treeToArray(output);
        }}

        let passed;
        if (orderMatters) {{
            passed = JSON.stringify(output) === JSON.stringify(testCase.expected);
        }} else {{
            // --- BUG FIX: Proper deep sorting for Numbers vs Strings ---
            const sortDeep = (arr) => {{
                if (!Array.isArray(arr)) return arr;
                return [...arr].map(sortDeep).sort((a, b) => {{
                    if (typeof a === 'number' && typeof b === 'number') return a - b;
                    return String(a).localeCompare(String(b));
                }});
            }};
            
            passed = JSON.stringify(sortDeep(output)) === JSON.stringify(sortDeep(testCase.expected));
        }}

        results.push({{
            input: testCase.input,
            passed: passed,
            output: output,
            expected: testCase.expected,
            execution_ms: Math.floor(executionMs),
            stdout: capturedStdout
        }});
    }} catch (e) {{
        results.push({{
            input: testCase.input,
            passed: false,
            error: e.message,
            traceback: e.stack,
            stdout: capturedStdout,
            expected: testCase.expected
        }});
        break;
    }}
}}

// Restore original console.log to safely emit the final JSON
console.log = originalConsoleLog;
console.log(JSON.stringify(results));
"""

        image = "node:24.16.0-slim"
        interpreter = ["node", "-"]

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
        image,
        "timeout", "5s",
        *interpreter
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

