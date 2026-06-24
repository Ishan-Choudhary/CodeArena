from django.urls import path
from .views import *

urlpatterns = [
    path("", CreateRoom.as_view(), name="create_room"),
    path("<str:code>/", RoomInfo.as_view(), name="room_info"),
    path("<str:code>/join/", JoinRoom.as_view(), name="join_room"),
    path("<str:code>/end/", EndRoom.as_view(), name="end_room"),
    path("<str:code>/replay/", GetRoomPlayback.as_view(), name="get_room_replay_data")
]