from django.urls import path

from relate.chats.consumers import ChatConsumer

websocket_urlpatterns = [path("<conversation_name>/", ChatConsumer.as_asgi())]
