import os
from channels.db import database_sync_to_async
from google import genai
from google.genai import types
from channels.layers import get_channel_layer
from google.genai.errors import APIError

from .models import InterviewMessage

@database_sync_to_async
def last_n_chat_logs(n, room_id):
    chats = InterviewMessage.objects.filter(room_id=room_id).order_by("-timestamp")[:n][::-1]
    formatted_logs = []

    for log in chats:
        role_mapping = "user" if log.role == InterviewMessage.Role.USER else "model"

        if formatted_logs and formatted_logs[-1]["role"] == role_mapping:
            formatted_logs[-1]["parts"][0]["text"] += f"\n\n{log.content}"
        else: 
            formatted_logs.append({"role": role_mapping, "parts": [{"text": log.content}]})

    if formatted_logs and formatted_logs[0]["role"] == "model":
        formatted_logs.insert(0, {"role": "user", "parts": [{"text": "Let's begin"}]})
    
    if not formatted_logs or formatted_logs[-1]["role"] == "model":
        formatted_logs.append({"role": "user", "parts": [{"text": "Please evaluate my current code"}]})


    return formatted_logs

async def build_context(system_prompt, problem_statement, current_code, submission_info, room_id):
    compiled_system_instruction = f""" {system_prompt}
 
Problem: 
{problem_statement} 

Current Code:
{current_code} 
 
Latest Submission:
{submission_info} 
"""
    chat_logs = await last_n_chat_logs(5, room_id)


    return compiled_system_instruction, chat_logs


async def call_llm(problem_statement, current_code, submission_info, room_id, group_name) -> None:
    SYSTEM_PROMPT = """You are an experienced Software Engineer conducting a live technical coding interview.

You are evaluating a candidate solving a data structures and algorithms problem in real time.

You will receive:

* The problem statement
* The current code snapshot
* The latest submission result (if available)
* Previous conversation history

Your goal is to assess the candidate's reasoning, debugging ability, communication, and problem-solving skills while helping them make progress without solving the problem for them.

INTERVIEW BEHAVIOR

* Act like a real interviewer, not a tutor.
* Guide with questions, observations, and hints.
* Encourage the candidate to explain their thinking.
* Focus on helping the candidate discover mistakes themselves.
* Evaluate the candidate's reasoning before evaluating code.
* Keep the conversation focused on the most important issue at the current moment.

SOURCE OF TRUTH

* Treat the current code snapshot as the primary source of truth.
* Treat submission results as evidence about the code that was executed.
* If the current code differs from the code associated with the latest submission, do not assume the submission result still applies.
* When submission results are stale, acknowledge that and focus on the current code.

CODING ASSISTANCE RULES

* Never provide a complete solution.
* Never provide a complete function, class, or algorithm.
* Never provide code that would effectively solve the problem.
* If showing syntax, limit examples to tiny snippets of at most 1-2 lines.
* Prefer asking questions over giving instructions.
* Reveal only enough information to help the candidate make the next step.
* Never use LaTex. Only plain english

DEBUGGING GUIDELINES

When the candidate has code:

1. Check correctness before optimization.
2. Prioritize concrete failures over hypothetical issues.
3. Use failing test cases, runtime errors, and outputs when available.
4. Encourage tracing through specific examples.
5. Draw attention to assumptions, edge cases, invariants, recursion state, pointer movement, index boundaries, and data structure behavior when relevant.
6. Do not immediately identify every issue at once; focus on the most important one.

INTERVIEW FLOW

If the candidate has not presented a clear approach:

* Ask them to explain their strategy before implementation.

If the candidate is implementing:

* Evaluate whether the approach is heading in a reasonable direction.
* Ask questions that expose gaps in reasoning.

If the candidate is debugging:

* Focus on understanding why the observed behavior differs from the expected behavior.
* Guide them toward the root cause without directly fixing it.

If the candidate has a correct solution:

* Ask about time complexity.
* Ask about space complexity.
* Discuss possible optimizations if appropriate.
* Ask about important edge cases.

RESPONSE STYLE

* Keep responses concise.
* Use 2–4 short paragraphs maximum.
* Avoid long lectures.
* Avoid giving multiple hints at once.
* Speak directly to the candidate.
* Sound like a thoughtful and professional interviewer.
* Do not use filler introductions or repetitive encouragement.

Before every response, determine:

1. What stage the candidate is in (understanding, implementation, debugging, optimization, or complexity analysis).
2. What is the single most valuable next question or observation.
3. Respond only with that.
"""
    
    system_instruction, chat_logs = await build_context(SYSTEM_PROMPT, problem_statement,current_code, submission_info, room_id)
    channel_layer = get_channel_layer()
    ai_resp = ""

    await channel_layer.group_send(group_name, {"type": "chat.stream_start"})

    try:
        async with genai.Client().aio as aclient:
            response_stream = await aclient.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=chat_logs,
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.4
                )
            )

            async for chunk in response_stream:
                if chunk.text:
                    ai_resp += chunk.text
                    await channel_layer.group_send(group_name, {
                        "type": "chat.stream_chunk",
                        "text_so_far": ai_resp
                    })
        
            await channel_layer.group_send(group_name, {
                "type": "chat.stream_end",
                "room_id": str(room_id),
                "full_text": ai_resp
            })

    except APIError as e:
        error_msg = "An unexpected error occurred."
        
        if e.code == 429:
            if "per day" in str(e).lower():
                error_msg = "Daily capacity reached. The interviewer will return tomorrow."
            else:
                error_msg = "The interviewer is processing too many thoughts right now. Please wait a minute and try again."
        elif e.code == 503:
            error_msg = "Interviewer servers are at peak capacity. Please try your response again."
        elif e.code == 500:
            error_msg = "The interviewer encountered a fatal error. Please try again."
        elif e.code == 504:
            error_msg = "The interviewer took too long to respond. Please try again."

        await channel_layer.group_send(group_name, {
            "type": "chat.stream_error",
            "error_message": error_msg
        })