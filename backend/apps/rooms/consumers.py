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
        

        if(room.host == user):
            partner_name = room.participant.username if room.participant else None
            return "host", partner_name
        elif(room.participant == user):
            partner_name = room.host.username if room.host else None
            return "participant", partner_name
        else:
            return "denied", False
    except Room.DoesNotExist:
        return "denied", False

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name= self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"room_{self.room_name}"
        self.user = self.scope["user"]

        user_role, partner_name = await check_perms(self.room_name, self.user)

        if(user_role == "denied"):
            await self.close()
            return
    
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
        if(event.get("sender_channel_name") == self.channel_name):
            return
        
        await self.send(text_data=json.dumps({
            "type": "participant_joined",
            "user": event["user"]
        }))

    async def heartbeat_pulse(self, event):
        pass

    async def room_ended(self, event):
        await self.send(text_data=json.dumps({
            "type": "room_ended",
        }))

        await self.close()
