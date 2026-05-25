from rest_framework import permissions
from .models import Room

class IsHost(permissions.BasePermission):
    message = "You are not the host"

    def has_object_permission(self, request, view, obj):
        return obj.host == request.user
    
class IsRoomJoinable(permissions.BasePermission):
    message = "Room is not available to join"

    def has_object_permission(self, request, view, obj):
        return obj.status == Room.Status.WAITING and obj.host != request.user