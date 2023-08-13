from django.conf import settings
from rest_framework.routers import DefaultRouter, SimpleRouter

from relate.chats.api.views import ConversationViewSet
from relate.users.api.views import UserViewSet

if settings.DEBUG:
    router = DefaultRouter()
else:
    router = SimpleRouter()

router.register("users", UserViewSet)
router.register("conversations", ConversationViewSet)


app_name = "api"
urlpatterns = router.urls
