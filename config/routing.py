from django.urls import path

from relate.chats.consumers import ChatConsumer

websocket_urlpatterns = [path("", ChatConsumer.as_asgi())]
