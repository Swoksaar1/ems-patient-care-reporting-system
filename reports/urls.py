from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from .views import ReportViewSet, MeView, AccountUpdateView

router = DefaultRouter()
router.register(r"reports", ReportViewSet, basename="reports")

urlpatterns = [
    # Health check
    path("health/", views.health, name="health"),

    # JWT
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Auth / Account
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/account/", AccountUpdateView.as_view(), name="auth-account"),

    # ViewSet routes (/reports/, /reports/<id>/)
    path("", include(router.urls)),
]
