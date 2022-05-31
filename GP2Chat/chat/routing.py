from django.urls import re_path
from . import consumers

websocket_urlpatters = [
    re_path(r'ws/socket-server/', consumers.ChatConsumer.as_asgi()),
    #re_path(r'ws/socket-server/', consumers.OnlineConsumer.as_asgi())
]