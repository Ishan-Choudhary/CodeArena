from celery import shared_task
from django.utils.timezone import now
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from apps.rooms.models import Room

@shared_task
def cleanup_dead_rooms():
    channel_layer = get_channel_layer()
    
    stale_waiting_rooms = Room.objects.filter(
        status='WAITING', 
        created_at__lt=now() - timedelta(minutes=30)
    )
    
    for room in stale_waiting_rooms:
        async_to_sync(channel_layer.group_send)(
            f"room_{room.code}",
            {"type": "room.ended"}
        )
        room.delete()
        
    stale_active_rooms = Room.objects.filter(
        status='ACTIVE', 
        created_at__lt=now() - timedelta(hours=1, minutes=15)
    )
    
    for room in stale_active_rooms:
        room.status = 'ENDED'
        room.ended_at = now()
        room.save()
        
        async_to_sync(channel_layer.group_send)(
            f"room_{room.code}",
            {"type": "room.ended"}
        )
