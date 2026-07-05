import asyncio
import json
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core import serializers
from django.core.cache import cache

from apps.rooms.models import Room
from apps.executor.utils import run_code
from apps.executor.models import Submission
from apps.interviewer.models import InterviewMessage
from apps.interviewer import interviewer

@database_sync_to_async
def check_perms(room_name, user):
    room = Room.objects.select_related("host", "participant").filter(code=room_name).first()
    if not room:
        return "denied", False
    

    if(room.host == user):
        partner_name = room.participant.username if room.participant else None
        return "host", partner_name
    elif(room.participant == user):
        partner_name = room.host.username if room.host else None
        return "participant", partner_name
    else:
        return "denied", False

@database_sync_to_async
def get_room_details(room_name):
    return Room.objects.select_related("problem").filter(code=room_name).first()

@database_sync_to_async
def save_submission(error_type, user, room_id, codeContent, execution_ms=None, stdout=None, expected_output="", actual_output=""):
    submission_instance = Submission(room_id=room_id, user=user, status=error_type, code=codeContent, expected_output=expected_output, actual_output=actual_output)

    if execution_ms:
        submission_instance.execution_time = execution_ms
    if stdout:
        submission_instance.stdout = stdout

    submission_instance.save()
    return submission_instance

@database_sync_to_async
def save_message(room_id, role, content):
    instance = InterviewMessage(room_id=room_id, role=role, content=content)

    instance.save()

@database_sync_to_async
def get_submission_info(room_id):
    latest_submission = Submission.objects.filter(room_id=room_id).order_by("-submitted_at")[:1]
    json_serialized = serializers.serialize("json", latest_submission)

    return json_serialized

class BaseRoomConsumer(AsyncWebsocketConsumer):
    @property
    def cache_key(self):
        return f"room_{self.room_name}_user_{self.user.username}_channel"

    async def disconnect(self, close_code):
        active_channel = await cache.aget(self.cache_key)
        if active_channel == self.channel_name:
            await cache.adelete(self.cache_key)

        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            if(data.get("type") == "ping"):
                await self.send(text_data=json.dumps({"type": "pong"}))
                
            elif(data.get("type") == "submission.request"):
                data["user"] = self.user.username
                await self.channel_layer.group_send(self.room_group_name, data)
            
            elif(data.get("type") == "chat.message"):
                data["user"] = self.user.username
                await self.channel_layer.group_send(self.room_group_name, data)
                
            return

        except json.JSONDecodeError:
            pass

    async def force_disconnect(self, event):
        await self.send(text_data=json.dumps({
            "type": "error", 
            "message": "You connected from another device. Disconnecting."
        }))
        await self.close(code=4001)


    async def participant_joined(self, event):
        if(event.get("sender_channel_name") == self.channel_name):
            return
        
        await self.send(text_data=json.dumps({
            "type": "participant_joined",
            "user": event["user"]
        }))

    async def room_ended(self, event):
        await self.close(code=4000)

    async def submission_request(self, event):
        if self.scope["user"].username == event["user"]:
            dataDict = event["data"]
            code = dataDict["code"]

            if not isinstance(code, str) or not code.strip() or len(code) > 100_000:
                await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "message": "Code is not valid!", "status": "client_error"})

            room_obj = await get_room_details(self.room_name)

            if not room_obj:
                await self.channel_layer.group_send("room_ended")

            code_output_raw = await sync_to_async(run_code)(room_obj.problem.test_cases, code, room_obj.problem.order_matters, room_obj.problem.input_types, room_obj.problem.output_type, room_obj.language.lower())
            code_output = json.loads(code_output_raw)

            if "error" in code_output[0] and "input" not in code_output[0]:
                err_msg = code_output[0]["error"]

                if "Host" in code_output[0]["error"]:
                    await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "message": err_msg, "status": "server_error"})
                    return

                err_type = Submission.Status.TIMEOUT if code_output[0].get("is_timeout") else Submission.Status.ERROR
                submission_instance = await save_submission(error_type=err_type, user=self.scope["user"], room_id=room_obj.id, codeContent=code)
                
                await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "status": submission_instance.status, "message": err_msg, "details": code_output[0].get("details", "")})
                return

            failed_cases = [case for case in code_output if case["passed"] == False]
            passed_cases = [case for case in code_output if case["passed"] == True]

            avg_execution_time = -1

            if not failed_cases:
                avg_execution_time = sum(case["execution_ms"] for case in passed_cases)/len(passed_cases)

                submission_instance = await save_submission(error_type=Submission.Status.ACCEPTED, execution_ms=avg_execution_time, user=self.scope["user"], room_id=room_obj.id, codeContent=code)

                await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "status": submission_instance.status, "execution_time": avg_execution_time})

            else:
                failed_case = failed_cases[0]
                submission_instance = await save_submission(error_type=Submission.Status.WRONG, room_id = room_obj.id, codeContent=code, execution_ms=avg_execution_time, stdout=failed_case.get("stdout", ""), user=self.scope["user"], expected_output=failed_case.get("expected"), actual_output=failed_case.get("output"))

                await self.channel_layer.group_send(self.room_group_name, {
                    "type": "submission.result",
                    "status": submission_instance.status,
                    "traceback": failed_case.get("traceback", ""),
                    "actual_output": failed_case.get("output"),
                    "stdout": failed_case.get("stdout", ""),
                    "expected_output": failed_case.get("expected")
                })

        else:
            await self.send(text_data=json.dumps({"type": "submission.loading", "message": "Running your submitted code"}))
 
    async def submission_result(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_message(self, event):
        if event["user"] == self.user.username:
            await self.send(text_data=json.dumps({"type": "chat.message", "from": "sender", "message": event["data"]["message"]}))
        else:
            await self.send(text_data=json.dumps({"type": "chat.message", "from": "receiver", "message": event["data"]["message"]}))

class MockModeRoomConsumer(BaseRoomConsumer):
    async def connect(self):
        self.room_name= self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"room_{self.room_name}"
        self.user = self.scope["user"]

        user_role, partner_name = await check_perms(self.room_name, self.user)

        if(user_role == "denied"):
            await self.close()
            return

        existing_channel = await cache.aget(self.cache_key)
        if existing_channel:
            await self.channel_layer.send(existing_channel, {
                "type": "force_disconnect"
            })
        await cache.aset(self.cache_key, self.channel_name, timeout=86400)

        await self.accept()
        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )

        if partner_name:
            await self.send(text_data=json.dumps({
                "type": "participant_joined",
                "user": partner_name
            }))

        if user_role == "participant":
            await self.channel_layer.group_send(self.room_group_name, {"type": "participant.joined", "sender_channel_name": self.channel_name, "user": self.user.username})

class AiRoomConsumer(BaseRoomConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"room_{self.room_name}"
        self.user = self.scope["user"]

        existing_channel = await sync_to_async(cache.get)(self.cache_key)

        if existing_channel:
            await self.channel_layer.send(existing_channel, {
                "type": "force_disconnect"
            })

        await cache.aset(self.cache_key, self.channel_name, timeout=86400)
        await self.accept()
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if(data.get("type") == "chat.message"):
                await self.channel_layer.group_send(self.room_group_name, data)
                return
            else:
                await super().receive(text_data)
        except json.JSONDecodeError:
            pass

    async def chat_message(self, event):
        room_obj = await get_room_details(room_name=self.room_name)
        msg_content = event["data"]["message"]

        obj_data = {"type": "chat.message", "from": "sender", "message": msg_content}
        await self.send(text_data=json.dumps(obj_data))
        await save_message(room_obj.id, InterviewMessage.Role.USER, msg_content)
        
        submission_info = await get_submission_info(room_obj.id)
        asyncio.create_task(interviewer.call_llm(room_obj.problem.description, event["data"]["code"], submission_info, room_obj.id, self.room_group_name))


    async def submission_request(self, event):
        dataDict = event["data"]
        code = dataDict["code"]

        if not isinstance(code, str) or not code.strip() or len(code) > 100_000:
            await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "message": "Code is not valid!", "status": "client_error"})
            return
        
        room_obj = await get_room_details(self.room_name)

        if not room_obj:
            await self.channel_layer.group_send("room_ended")

        code_output_raw = await sync_to_async(run_code)(room_obj.problem.test_cases, code, room_obj.problem.order_matters, room_obj.problem.input_types, room_obj.problem.output_type, room_obj.language.lower())
        code_output = json.loads(code_output_raw)

        if "error" in code_output[0] and "input" not in code_output[0]:
            err_msg = code_output[0]["error"]

            if "Host" in code_output[0]["error"]:
                await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "message": err_msg, "status": "server_error"})
                return

            err_type = Submission.Status.TIMEOUT if code_output[0].get("is_timeout") else Submission.Status.ERROR
            submission_instance = await save_submission(error_type=err_type, user=self.scope["user"], room_id=room_obj.id, codeContent=code)
            
            await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "status": submission_instance.status, "message": err_msg, "details": code_output[0].get("details", "")})
            submission_info = await get_submission_info(room_obj.id)
            asyncio.create_task(interviewer.call_llm(room_obj.problem.description, code, submission_info, room_obj.id, self.room_group_name))
            return

        failed_cases = [case for case in code_output if case["passed"] == False]
        passed_cases = [case for case in code_output if case["passed"] == True]

        avg_execution_time = -1

        if not failed_cases:
            avg_execution_time = sum(case["execution_ms"] for case in passed_cases)/len(passed_cases)

            submission_instance = await save_submission(error_type=Submission.Status.ACCEPTED, execution_ms=avg_execution_time, user=self.scope["user"], room_id=room_obj.id, codeContent=code)

            await self.channel_layer.group_send(self.room_group_name, {"type": "submission.result", "status": submission_instance.status, "execution_time": avg_execution_time})

        else:
            failed_case = failed_cases[0]
            submission_instance = await save_submission(error_type=Submission.Status.WRONG, room_id = room_obj.id, codeContent=code, execution_ms=avg_execution_time, stdout=failed_case.get("stdout", ""), user=self.scope["user"], expected_output=failed_case.get("expected"), actual_output=failed_case.get("output"))

            await self.channel_layer.group_send(self.room_group_name, {
                "type": "submission.result",
                "status": submission_instance.status,
                "traceback": failed_case.get("traceback", ""),
                "actual_output": failed_case.get("output"),
                "stdout": failed_case.get("stdout", ""),
                "expected_output": failed_case.get("expected")
            })

        submission_info = await get_submission_info(room_obj.id)
        asyncio.create_task(interviewer.call_llm(room_obj.problem.description, code, submission_info, room_obj.id, self.room_group_name))
        return

    async def chat_stream_start(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_stream_chunk(self, event):
        await self.send(text_data=json.dumps(event))
        
    async def chat_stream_end(self, event):
        await self.send(text_data=json.dumps({"type": event["type"], "message": event["full_text"]}))
        await save_message(event["room_id"], InterviewMessage.Role.ASSISTANT, event["full_text"])