import json
import re
from datetime import date, datetime

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


DATE_FIELDS = {
    "doi",
}

TIME_FIELDS = {
    "toi",
}

DATETIME_FIELDS = {
    "call_received_time",
    "responded_time",
    "arrived_scene_time",
    "left_scene_time",
    "arrived_hospital_time",
    "back_in_service_time",
    "time",  # used inside vitals
}

NESTED_JSON_FIELDS = {
    "vitals",
    "gcs",
    "apgar",
    "non_transport",
    "belongings",
    "ems_crew",
    "receiving_physician_nod",
    "patient",
    "incident",
}


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


def _blank_to_none(value):
    if value is None:
        return None

    if isinstance(value, str):
        cleaned = value.strip()

        if cleaned == "":
            return None

        if cleaned.lower() in {"null", "none", "undefined"}:
            return None

    return value


def _get_date_string(value):
    value = _blank_to_none(value)

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    text = str(value).strip()

    # YYYY-MM-DD
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text

    # ISO datetime string, use the date part
    iso_match = re.match(r"^(\d{4}-\d{2}-\d{2})[T\s]", text)
    if iso_match:
        return iso_match.group(1)

    return None


def _normalize_time_only(value):
    value = _blank_to_none(value)

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.time().replace(microsecond=0).isoformat()

    text = str(value).strip()

    # 0741 -> 07:41:00
    if re.fullmatch(r"\d{3,4}", text):
        text = text.zfill(4)
        hour = int(text[:2])
        minute = int(text[2:4])

        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return f"{hour:02d}:{minute:02d}:00"

    # 07:41 or 7:41 -> 07:41:00
    match = re.fullmatch(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", text)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
        second = int(match.group(3) or 0)

        if 0 <= hour <= 23 and 0 <= minute <= 59 and 0 <= second <= 59:
            return f"{hour:02d}:{minute:02d}:{second:02d}"

    return value


def _normalize_datetime(value, base_date_string=None):
    value = _blank_to_none(value)

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    text = str(value).strip()

    # Already looks like a full date/datetime. Let DRF parse it.
    if re.match(r"^\d{4}-\d{2}-\d{2}", text):
        return text

    time_only = _normalize_time_only(text)

    if time_only is None:
        return None

    # If the frontend sends 0741, combine it with DOI.
    if base_date_string and isinstance(time_only, str) and re.fullmatch(r"\d{2}:\d{2}:\d{2}", time_only):
        return f"{base_date_string}T{time_only}"

    return value


def _normalize_vitals(vitals, base_date_string=None):
    if not isinstance(vitals, list):
        return vitals

    normalized = []

    for item in vitals:
        if not isinstance(item, dict):
            normalized.append(item)
            continue

        copied = dict(item)

        if "time" in copied:
            copied["time"] = _normalize_datetime(copied.get("time"), base_date_string)

        normalized.append(copied)

    return normalized


def _normalize_temporal_fields(data, instance=None):
    if not isinstance(data, dict):
        return data

    normalized = dict(data)

    # Use incoming DOI first. On update, use existing DOI when DOI is not in the request.
    base_date_string = _get_date_string(normalized.get("doi"))

    if not base_date_string and instance is not None:
        base_date_string = _get_date_string(getattr(instance, "doi", None))

    for field in DATE_FIELDS:
        if field in normalized:
            normalized[field] = _blank_to_none(normalized.get(field))

    for field in TIME_FIELDS:
        if field in normalized:
            normalized[field] = _normalize_time_only(normalized.get(field))

    for field in DATETIME_FIELDS:
        if field in normalized:
            normalized[field] = _normalize_datetime(normalized.get(field), base_date_string)

    if "vitals" in normalized:
        normalized["vitals"] = _normalize_vitals(normalized.get("vitals"), base_date_string)

    return normalized


class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """
        The list endpoint /api/reports/ is used by Dashboard, Reports, and Patients.

        For list, load the patient table only.
        This keeps the dashboard/reports fast and avoids problems from optional
        one-to-one tables like gcs, apgar, non_transport, belongings,
        ems_crew, receiving_physician_nod, and incident.
        """

        if self.action == "list":
            return (
                Report.objects.all()
                .select_related("patient")
                .order_by("-id")
            )

        return (
            Report.objects.all()
            .select_related("patient")
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

    def _normalize_request_data(self, request, instance=None):
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

                if key in NESTED_JSON_FIELDS:
                    data[key] = self._maybe_json_load(value)
                else:
                    data[key] = value

        if "attachment" in request.data:
            data["attachment"] = request.data.get("attachment")

        return _normalize_temporal_fields(data, instance=instance)

    def create(self, request, *args, **kwargs):
        try:
            data = self._normalize_request_data(request)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            data = self._normalize_request_data(request, instance=instance)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

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