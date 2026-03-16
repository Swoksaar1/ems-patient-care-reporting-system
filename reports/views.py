import json

from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView

from reports.models import Report
from reports.serializers import (
    ReportListSerializer,
    ReportDetailSerializer,
    ReportCreateSerializer,
    AccountUpdateSerializer,
)


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    queryset = (
        Report.objects.all()
        .select_related(
            "patient",
            "gcs",
            "apgar",
            "non_transport",
            "belongings",
            "ems_crew",
            "receiving_physician_nod",
            "incident",
        )
        .prefetch_related("vitals")
        .order_by("-id")
    )

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ReportCreateSerializer
        if self.action == "retrieve":
            return ReportDetailSerializer
        return ReportListSerializer

    def get_serializer_context(self):
        return {"request": self.request}

    def _maybe_json_load(self, value):
        if value is None:
            return None

        if isinstance(value, (dict, list)):
            return value

        if isinstance(value, str):
            s = value.strip()
            if not s:
                return None
            try:
                return json.loads(s)
            except json.JSONDecodeError:
                return value

        return value

    def _normalize_request_data(self, request):
        data = {}

        if "payload" in request.data:
            payload_str = request.data.get("payload", "{}")
            try:
                payload = json.loads(payload_str)
            except json.JSONDecodeError:
                raise ValueError("Invalid payload JSON")

            if not isinstance(payload, dict):
                raise ValueError("Payload must be a JSON object")

            data.update(payload)
        else:
            for key in request.data.keys():
                value = request.data.get(key)

                if key in [
                    "vitals",
                    "gcs",
                    "apgar",
                    "non_transport",
                    "belongings",
                    "ems_crew",
                    "receiving_physician_nod",
                    "patient",
                    "incident",
                ]:
                    data[key] = self._maybe_json_load(value)
                else:
                    data[key] = value

        if "attachment" in request.data:
            data["attachment"] = request.data.get("attachment")

        return data

    def create(self, request, *args, **kwargs):
        try:
            data = self._normalize_request_data(request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(
            data=data,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        report = serializer.save()

        return Response(
            ReportDetailSerializer(
                report,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        try:
            data = self._normalize_request_data(request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(
            instance,
            data=data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        report = serializer.save()

        return Response(
            ReportDetailSerializer(
                report,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
            }
        )


class AccountUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = AccountUpdateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        data = serializer.validated_data

        if "username" in data:
            user.username = data["username"]

        if "new_password" in data:
            user.set_password(data["new_password"])

        user.save()

        return Response(
            {"detail": "Account updated."},
            status=status.HTTP_200_OK,
        )