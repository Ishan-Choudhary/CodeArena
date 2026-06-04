import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from apps.rooms.models import Room

@database_sync_to_async
def check_perms(room_name, user):
    try:
        room = Room.objects.select_related("host", "participant").filter(code=room_name).first()
        if not room:
            return "denied", False
        
        participant_exists = (room.participant is not None)
        if(room.host == user):
            return "host", participant_exists
        elif(room.participant == user):
            return "participant", True  
        else:
            return "denied", False
    except Room.DoesNotExist:
        return "denied", False

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name= self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"room_{self.room_name}"
        self.user = self.scope["user"]

        user_role, participant_exists = await check_perms(self.room_name, self.user)

        if(user_role == "denied"):
            await self.close()
            return
    
        await self.accept()
        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )


        if user_role == "participant":
            await self.channel_layer.group_send(self.room_group_name, {"type": "participant.joined"})

        elif user_role == "host":
            if participant_exists:
                await self.send(text_data=json.dumps({
                    "type": "participant_joined"
                }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            
            if(text_data_json.get("type") == "ping"):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "heartbeat.pulse"}
                )
                return

        except json.JSONDecodeError:
            pass

    async def participant_joined(self, event):
        await self.send(text_data=json.dumps({
            "type": "participant_joined",
        }))

    async def heartbeat_pulse(self, event):
        pass

    async def room_ended(self, event):
        await self.send(text_data=json.dumps({
            "type": "room_ended",
        }))

        self.close()