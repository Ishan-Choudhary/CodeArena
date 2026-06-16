from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/room/(?P<room_name>\w+)/$", consumers.MockModeRoomConsumer.as_asgi()),
    re_path(r"ws/practice/(?P<room_name>\w+)/$", consumers.AiRoomConsumer.as_asgi()),
]