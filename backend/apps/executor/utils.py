def main(test_cases, code):
    import docker
    import json

    client = docker.from_env()

    container = client.containers.run(
        "python:3.14-slim", 
        detach=True,
        tty=True,
        network_disabled=True,
        mem_limit="256m",
        read_only=True,
        user="1000:1000",
        pids_limit=50,
        security_opt=["no-new-privileges"],
        cap_drop=["ALL"]
        )


    code_content = f"""import json

    {code}                

    test_cases = {test_cases}

    results = []
    for case in test_cases:
        try:
            output = main(**case["input"])
            results.append({"input": case["input"], "passed": sorted(output) == sorted(case["expected"]), "output": output, "expected": case["expected"]})

        except Exception as e:
            results.append({"input": case["input"], "passed": False, "error": str(e)})
            break

    return json.dumps(result)
    """


    code_content = code_content.replace("'", "'\\''")

    try:
        result = container.exec_run(["bash", "-c", f"cat << 'EOF' | timeout 5s python3 -\n{code_content}\nEOF"])    
        raw_output = result[1].decode("utf-8").strip()
        if raw_output:
            print(raw_output)
        else:
            print(json.dumps([{"error": "Execution timed out or failed to produce output"}]))
    finally:
        container.stop()
        container.remove()

if __name__ == "__main__":
    main()