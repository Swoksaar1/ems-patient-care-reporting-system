from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from rest_framework import serializers

from .models import (
    Patient,
    Report,
    Vital,
    GCS,
    APGAR,
    NonTransport,
    Belongings,
    EmsCrew,
    ReceivingPhysicianNOD,
    Incident,
)

User = get_user_model()


# =========================
# MODEL SERIALIZERS (READ / OUTPUT)
# =========================

class PatientSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=True, allow_blank=False)
    middle_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    sex = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="male")
    weight = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    contact_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    chief_complaint = serializers.CharField(required=True, allow_blank=False)
    assessment = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")

    class Meta:
        model = Patient
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class VitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vital
        fields = [
            "id",
            "time",
            "bp",
            "pulse_rate",
            "resp_rate",
            "resp_quality",
            "temperature_value",
            "temperature_state",
            "spo2",
            "skin_color",
            "pupils",
            "cap_refill",
            "location",
        ]
        read_only_fields = ["id"]


class AttachmentMixin(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()

    def get_attachment_url(self, obj):
        if not getattr(obj, "attachment", None):
            return None
        request = self.context.get("request")
        url = obj.attachment.url
        return request.build_absolute_uri(url) if request else url


class GCSSerializer(serializers.ModelSerializer):
    class Meta:
        model = GCS
        fields = ["eye_score", "verbal_score", "motor_score", "total_score"]


class APGARSerializer(serializers.ModelSerializer):
    class Meta:
        model = APGAR
        fields = ["appearance", "pulse", "grimace", "activity", "respiration", "total_score"]


class NonTransportSerializer(serializers.ModelSerializer):
    class Meta:
        model = NonTransport
        fields = ["reason"]


class BelongingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Belongings
        fields = ["items", "turned_over_to", "received_by", "notes"]


class EmsCrewSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmsCrew
        fields = ["ems_in_charge", "ems_assistant_1", "ems_assistant_2", "ems_operator"]


class ReceivingPhysicianNODSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceivingPhysicianNOD
        fields = ["physician_nod", "signature_data_url"]


class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = ["level_of_consciousness", "created_at"]
        read_only_fields = ["created_at"]


class ReportListSerializer(AttachmentMixin):
    patient = PatientSerializer(read_only=True)
    patient_name = serializers.SerializerMethodField()
    chief_complaint = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "patient",
            "patient_name",
            "chief_complaint",
            "ambulance_body_no",
            "call_no",
            "case_no",
            "patient_location",
            "transported_to",
            "doi",
            "toi",
            "poi",
            "moi",
            "call_received_time",
            "responded_time",
            "arrived_scene_time",
            "left_scene_time",
            "arrived_hospital_time",
            "back_in_service_time",
            "intervention_notes",
            "apgar_enabled",
            "non_transport_enabled",
            "status",
            "created_at",
            "attachment",
            "attachment_url",
        ]
        read_only_fields = ["id", "case_no", "created_at", "attachment_url"]

    def get_patient_name(self, obj):
        if not obj.patient:
            return ""
        parts = [
            obj.patient.first_name or "",
            obj.patient.middle_name or "",
            obj.patient.last_name or "",
        ]
        return " ".join(p for p in parts if p).strip()

    def get_chief_complaint(self, obj):
        return (obj.patient.chief_complaint or "") if obj.patient else ""


class ReportDetailSerializer(AttachmentMixin):
    patient = PatientSerializer(read_only=True)
    vitals = VitalSerializer(many=True, read_only=True)
    gcs = GCSSerializer(read_only=True)
    apgar = APGARSerializer(read_only=True)
    non_transport = NonTransportSerializer(read_only=True)
    belongings = BelongingsSerializer(read_only=True)
    ems_crew = EmsCrewSerializer(read_only=True)
    receiving_physician_nod = ReceivingPhysicianNODSerializer(read_only=True)
    incident = IncidentSerializer(read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "patient",
            "ambulance_body_no",
            "call_no",
            "case_no",
            "patient_location",
            "transported_to",
            "doi",
            "toi",
            "poi",
            "moi",
            "call_received_time",
            "responded_time",
            "arrived_scene_time",
            "left_scene_time",
            "arrived_hospital_time",
            "back_in_service_time",
            "intervention_notes",
            "apgar_enabled",
            "non_transport_enabled",
            "status",
            "created_at",
            "vitals",
            "gcs",
            "apgar",
            "non_transport",
            "belongings",
            "ems_crew",
            "receiving_physician_nod",
            "incident",
            "attachment",
            "attachment_url",
        ]
        read_only_fields = ["id", "case_no", "created_at", "attachment_url"]


# =========================
# PAYLOAD SERIALIZERS (WRITE / INPUT)
# =========================

class PatientPayloadSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    middle_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    sex = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="male")
    weight = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    contact_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    chief_complaint = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    assessment = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")


class GCSPayloadSerializer(serializers.Serializer):
    eye_score = serializers.CharField(required=False, allow_blank=True)
    verbal_score = serializers.CharField(required=False, allow_blank=True)
    motor_score = serializers.CharField(required=False, allow_blank=True)
    total_score = serializers.IntegerField(required=False, allow_null=True)


class APGARPayloadSerializer(serializers.Serializer):
    appearance = serializers.CharField(required=False, allow_blank=True)
    pulse = serializers.CharField(required=False, allow_blank=True)
    grimace = serializers.CharField(required=False, allow_blank=True)
    activity = serializers.CharField(required=False, allow_blank=True)
    respiration = serializers.CharField(required=False, allow_blank=True)
    total_score = serializers.IntegerField(required=False, allow_null=True)


class NonTransportPayloadSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class BelongingsPayloadSerializer(serializers.Serializer):
    items = serializers.CharField(required=False, allow_blank=True)
    turned_over_to = serializers.CharField(required=False, allow_blank=True)
    received_by = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class EmsCrewPayloadSerializer(serializers.Serializer):
    ems_in_charge = serializers.CharField(required=False, allow_blank=True)
    ems_assistant_1 = serializers.CharField(required=False, allow_blank=True)
    ems_assistant_2 = serializers.CharField(required=False, allow_blank=True)
    ems_operator = serializers.CharField(required=False, allow_blank=True)


class ReceivingPhysicianPayloadSerializer(serializers.Serializer):
    physician_nod = serializers.CharField(required=False, allow_blank=True)
    signature_data_url = serializers.CharField(required=False, allow_blank=True)


class IncidentPayloadSerializer(serializers.Serializer):
    level_of_consciousness = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class VitalPayloadSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    time = serializers.DateTimeField(required=False, allow_null=True)
    bp = serializers.CharField(required=False, allow_blank=True)
    pulse_rate = serializers.CharField(required=False, allow_blank=True)
    resp_rate = serializers.CharField(required=False, allow_blank=True)
    resp_quality = serializers.CharField(required=False, allow_blank=True)
    temperature_value = serializers.CharField(required=False, allow_blank=True)
    temperature_state = serializers.CharField(required=False, allow_blank=True)
    spo2 = serializers.CharField(required=False, allow_blank=True)
    skin_color = serializers.CharField(required=False, allow_blank=True)
    pupils = serializers.CharField(required=False, allow_blank=True)
    cap_refill = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)


# =========================
# REPORT CREATE/UPDATE
# =========================

class ReportCreateSerializer(serializers.Serializer):
    patient = PatientPayloadSerializer(required=False)

    # flat patient fields for frontend compatibility
    first_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    middle_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    sex = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    weight = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    contact_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    chief_complaint = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    assessment = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    ambulance_body_no = serializers.CharField(required=False, allow_blank=True)
    call_no = serializers.CharField(required=False, allow_blank=True)
    patient_location = serializers.CharField(required=False, allow_blank=True)
    transported_to = serializers.CharField(required=False, allow_blank=True)

    doi = serializers.DateField(required=False, allow_null=True)
    toi = serializers.TimeField(required=False, allow_null=True)
    poi = serializers.CharField(required=False, allow_blank=True)
    moi = serializers.CharField(required=False, allow_blank=True)

    status = serializers.CharField(required=False, allow_blank=True)

    call_received_time = serializers.DateTimeField(required=False, allow_null=True)
    responded_time = serializers.DateTimeField(required=False, allow_null=True)
    arrived_scene_time = serializers.DateTimeField(required=False, allow_null=True)
    left_scene_time = serializers.DateTimeField(required=False, allow_null=True)
    arrived_hospital_time = serializers.DateTimeField(required=False, allow_null=True)
    back_in_service_time = serializers.DateTimeField(required=False, allow_null=True)

    intervention_notes = serializers.CharField(required=False, allow_blank=True)

    vitals = VitalPayloadSerializer(many=True, required=False)
    gcs = GCSPayloadSerializer(required=False, allow_null=True)
    apgar = APGARPayloadSerializer(required=False, allow_null=True)
    non_transport = NonTransportPayloadSerializer(required=False, allow_null=True)
    belongings = BelongingsPayloadSerializer(required=False, allow_null=True)
    ems_crew = EmsCrewPayloadSerializer(required=False, allow_null=True)
    receiving_physician_nod = ReceivingPhysicianPayloadSerializer(required=False, allow_null=True)
    incident = IncidentPayloadSerializer(required=False, allow_null=True)

    attachment = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        patient_data = attrs.get("patient") or {}

        first_name = (
            patient_data.get("first_name")
            if "first_name" in patient_data
            else attrs.get("first_name", "")
        ) or ""

        chief_complaint = (
            patient_data.get("chief_complaint")
            if "chief_complaint" in patient_data
            else attrs.get("chief_complaint", "")
        ) or ""

        ambulance_body_no = attrs.get("ambulance_body_no", "") or ""
        call_no = attrs.get("call_no", "") or ""

        errors = {}

        if not str(first_name).strip():
            errors.setdefault("patient", {})
            errors["patient"]["first_name"] = ["This field may not be blank."]

        if not str(chief_complaint).strip():
            errors.setdefault("patient", {})
            errors["patient"]["chief_complaint"] = ["This field may not be blank."]

        if not str(ambulance_body_no).strip():
            errors["ambulance_body_no"] = ["This field may not be blank."]

        if not str(call_no).strip():
            errors["call_no"] = ["This field may not be blank."]

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def _extract_patient_data(self, validated_data):
        nested = validated_data.get("patient") or {}

        return {
            "first_name": (nested.get("first_name", validated_data.get("first_name", "")) or "").strip(),
            "middle_name": (nested.get("middle_name", validated_data.get("middle_name", "")) or "").strip(),
            "last_name": (nested.get("last_name", validated_data.get("last_name", "")) or "").strip(),
            "sex": (nested.get("sex", validated_data.get("sex", "male")) or "male").strip(),
            "weight": (nested.get("weight", validated_data.get("weight", "")) or "").strip(),
            "contact_number": (nested.get("contact_number", validated_data.get("contact_number", "")) or "").strip(),
            "address": (nested.get("address", validated_data.get("address", "")) or "").strip(),
            "chief_complaint": (nested.get("chief_complaint", validated_data.get("chief_complaint", "")) or "").strip(),
            "assessment": (nested.get("assessment", validated_data.get("assessment", "")) or "").strip(),
        }

    @transaction.atomic
    def create(self, validated_data):
        patient_data = self._extract_patient_data(validated_data)
        patient = Patient.objects.create(**patient_data)

        vitals_data = validated_data.get("vitals", [])
        gcs_data = validated_data.get("gcs") or {}
        apgar_data = validated_data.get("apgar")
        non_transport_data = validated_data.get("non_transport")
        belongings_data = validated_data.get("belongings") or {}
        ems_crew_data = validated_data.get("ems_crew") or {}
        receiving_data = validated_data.get("receiving_physician_nod") or {}
        incident_data = validated_data.get("incident") or {}
        attachment = validated_data.get("attachment")

        report = Report.objects.create(
            patient=patient,
            ambulance_body_no=validated_data.get("ambulance_body_no", ""),
            call_no=validated_data.get("call_no", ""),
            patient_location=validated_data.get("patient_location", ""),
            transported_to=validated_data.get("transported_to", ""),
            doi=validated_data.get("doi"),
            toi=validated_data.get("toi"),
            poi=validated_data.get("poi", ""),
            moi=validated_data.get("moi", ""),
            status=validated_data.get("status", "draft") or "draft",
            call_received_time=validated_data.get("call_received_time"),
            responded_time=validated_data.get("responded_time"),
            arrived_scene_time=validated_data.get("arrived_scene_time"),
            left_scene_time=validated_data.get("left_scene_time"),
            arrived_hospital_time=validated_data.get("arrived_hospital_time"),
            back_in_service_time=validated_data.get("back_in_service_time"),
            intervention_notes=validated_data.get("intervention_notes", ""),
            apgar_enabled=bool(apgar_data),
            non_transport_enabled=bool(non_transport_data),
            attachment=attachment,
        )

        for v in vitals_data:
            Vital.objects.create(
                report=report,
                time=v.get("time"),
                bp=v.get("bp", ""),
                pulse_rate=v.get("pulse_rate", ""),
                resp_rate=v.get("resp_rate", ""),
                resp_quality=v.get("resp_quality", ""),
                temperature_value=v.get("temperature_value", ""),
                temperature_state=v.get("temperature_state", ""),
                spo2=v.get("spo2", ""),
                skin_color=v.get("skin_color", ""),
                pupils=v.get("pupils", ""),
                cap_refill=v.get("cap_refill", ""),
                location=v.get("location", ""),
            )

        if gcs_data:
            GCS.objects.create(
                report=report,
                eye_score=gcs_data.get("eye_score", ""),
                verbal_score=gcs_data.get("verbal_score", ""),
                motor_score=gcs_data.get("motor_score", ""),
                total_score=gcs_data.get("total_score") or 0,
            )

        if apgar_data:
            APGAR.objects.create(
                report=report,
                appearance=apgar_data.get("appearance", ""),
                pulse=apgar_data.get("pulse", ""),
                grimace=apgar_data.get("grimace", ""),
                activity=apgar_data.get("activity", ""),
                respiration=apgar_data.get("respiration", ""),
                total_score=apgar_data.get("total_score") or 0,
            )

        if non_transport_data:
            NonTransport.objects.create(
                report=report,
                reason=non_transport_data.get("reason", ""),
            )

        if belongings_data:
            Belongings.objects.create(report=report, **belongings_data)

        if ems_crew_data:
            EmsCrew.objects.create(report=report, **ems_crew_data)

        if receiving_data:
            ReceivingPhysicianNOD.objects.create(report=report, **receiving_data)

        if incident_data:
            Incident.objects.create(
                report=report,
                level_of_consciousness=incident_data.get("level_of_consciousness") or Incident.LOC_AWAKE,
            )

        return report

    @transaction.atomic
    def update(self, instance, validated_data):
        patient = instance.patient
        patient_data = self._extract_patient_data(validated_data)

        for field, value in patient_data.items():
            setattr(patient, field, value)
        patient.save()

        report_fields = [
            "ambulance_body_no",
            "call_no",
            "patient_location",
            "transported_to",
            "doi",
            "toi",
            "poi",
            "moi",
            "status",
            "call_received_time",
            "responded_time",
            "arrived_scene_time",
            "left_scene_time",
            "arrived_hospital_time",
            "back_in_service_time",
            "intervention_notes",
        ]
        for field in report_fields:
            if field in validated_data:
                setattr(instance, field, validated_data.get(field))

        if "attachment" in validated_data:
            instance.attachment = validated_data.get("attachment")

        if "vitals" in validated_data:
            vitals_data = validated_data.get("vitals") or []
            instance.vitals.all().delete()

            for v in vitals_data:
                Vital.objects.create(
                    report=instance,
                    time=v.get("time"),
                    bp=v.get("bp", ""),
                    pulse_rate=v.get("pulse_rate", ""),
                    resp_rate=v.get("resp_rate", ""),
                    resp_quality=v.get("resp_quality", ""),
                    temperature_value=v.get("temperature_value", ""),
                    temperature_state=v.get("temperature_state", ""),
                    spo2=v.get("spo2", ""),
                    skin_color=v.get("skin_color", ""),
                    pupils=v.get("pupils", ""),
                    cap_refill=v.get("cap_refill", ""),
                    location=v.get("location", ""),
                )

        if "gcs" in validated_data:
            gcs_data = validated_data.get("gcs")
            gcs_obj = getattr(instance, "gcs", None)

            if gcs_data:
                if gcs_obj:
                    gcs_obj.eye_score = gcs_data.get("eye_score", gcs_obj.eye_score)
                    gcs_obj.verbal_score = gcs_data.get("verbal_score", gcs_obj.verbal_score)
                    gcs_obj.motor_score = gcs_data.get("motor_score", gcs_obj.motor_score)
                    gcs_obj.total_score = gcs_data.get("total_score", gcs_obj.total_score)
                    gcs_obj.save()
                else:
                    GCS.objects.create(
                        report=instance,
                        eye_score=gcs_data.get("eye_score", ""),
                        verbal_score=gcs_data.get("verbal_score", ""),
                        motor_score=gcs_data.get("motor_score", ""),
                        total_score=gcs_data.get("total_score") or 0,
                    )
            else:
                if gcs_obj:
                    gcs_obj.delete()

        if "apgar" in validated_data:
            apgar_data = validated_data.get("apgar")
            apgar_obj = getattr(instance, "apgar", None)

            if apgar_data:
                instance.apgar_enabled = True
                if apgar_obj:
                    apgar_obj.appearance = apgar_data.get("appearance", apgar_obj.appearance)
                    apgar_obj.pulse = apgar_data.get("pulse", apgar_obj.pulse)
                    apgar_obj.grimace = apgar_data.get("grimace", apgar_obj.grimace)
                    apgar_obj.activity = apgar_data.get("activity", apgar_obj.activity)
                    apgar_obj.respiration = apgar_data.get("respiration", apgar_obj.respiration)
                    apgar_obj.total_score = apgar_data.get("total_score", apgar_obj.total_score)
                    apgar_obj.save()
                else:
                    APGAR.objects.create(
                        report=instance,
                        appearance=apgar_data.get("appearance", ""),
                        pulse=apgar_data.get("pulse", ""),
                        grimace=apgar_data.get("grimace", ""),
                        activity=apgar_data.get("activity", ""),
                        respiration=apgar_data.get("respiration", ""),
                        total_score=apgar_data.get("total_score") or 0,
                    )
            else:
                instance.apgar_enabled = False
                if apgar_obj:
                    apgar_obj.delete()

        if "non_transport" in validated_data:
            nt_data = validated_data.get("non_transport")
            nt_obj = getattr(instance, "non_transport", None)

            if nt_data:
                instance.non_transport_enabled = True
                if nt_obj:
                    nt_obj.reason = nt_data.get("reason", nt_obj.reason)
                    nt_obj.save()
                else:
                    NonTransport.objects.create(
                        report=instance,
                        reason=nt_data.get("reason", ""),
                    )
            else:
                instance.non_transport_enabled = False
                if nt_obj:
                    nt_obj.delete()

        if "belongings" in validated_data:
            belongings_data = validated_data.get("belongings") or {}
            obj = getattr(instance, "belongings", None)

            if belongings_data:
                if obj:
                    obj.items = belongings_data.get("items", obj.items)
                    obj.turned_over_to = belongings_data.get("turned_over_to", obj.turned_over_to)
                    obj.received_by = belongings_data.get("received_by", obj.received_by)
                    obj.notes = belongings_data.get("notes", obj.notes)
                    obj.save()
                else:
                    Belongings.objects.create(report=instance, **belongings_data)
            else:
                if obj:
                    obj.delete()

        if "ems_crew" in validated_data:
            crew_data = validated_data.get("ems_crew") or {}
            obj = getattr(instance, "ems_crew", None)

            if crew_data:
                if obj:
                    obj.ems_in_charge = crew_data.get("ems_in_charge", obj.ems_in_charge)
                    obj.ems_assistant_1 = crew_data.get("ems_assistant_1", obj.ems_assistant_1)
                    obj.ems_assistant_2 = crew_data.get("ems_assistant_2", obj.ems_assistant_2)
                    obj.ems_operator = crew_data.get("ems_operator", obj.ems_operator)
                    obj.save()
                else:
                    EmsCrew.objects.create(report=instance, **crew_data)
            else:
                if obj:
                    obj.delete()

        if "receiving_physician_nod" in validated_data:
            receiving_data = validated_data.get("receiving_physician_nod") or {}
            obj = getattr(instance, "receiving_physician_nod", None)

            if receiving_data:
                if obj:
                    obj.physician_nod = receiving_data.get("physician_nod", obj.physician_nod)
                    obj.signature_data_url = receiving_data.get("signature_data_url", obj.signature_data_url)
                    obj.save()
                else:
                    ReceivingPhysicianNOD.objects.create(report=instance, **receiving_data)
            else:
                if obj:
                    obj.delete()

        if "incident" in validated_data:
            incident_data = validated_data.get("incident")
            incident_obj = getattr(instance, "incident", None)

            if incident_data:
                if incident_obj:
                    incident_obj.level_of_consciousness = incident_data.get(
                        "level_of_consciousness",
                        incident_obj.level_of_consciousness,
                    )
                    incident_obj.save()
                else:
                    Incident.objects.create(
                        report=instance,
                        level_of_consciousness=incident_data.get("level_of_consciousness") or Incident.LOC_AWAKE,
                    )
            else:
                if incident_obj:
                    incident_obj.delete()

        instance.save()
        return instance

    def to_representation(self, instance):
        return ReportDetailSerializer(instance, context=self.context).data


# =========================
# ACCOUNT / AUTH SERIALIZER
# =========================

class AccountUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=False, max_length=150)
    current_password = serializers.CharField(required=False, write_only=True, allow_blank=False)
    new_password = serializers.CharField(required=False, write_only=True, allow_blank=False)
    confirm_password = serializers.CharField(required=False, write_only=True, allow_blank=False)

    def validate_username(self, value):
        user = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def validate(self, attrs):
        current_password = attrs.get("current_password")
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        wants_password_change = new_password or confirm_password

        if wants_password_change:
            if not current_password:
                raise serializers.ValidationError({
                    "current_password": "Current password is required."
                })

            user = self.context["request"].user
            if not user.check_password(current_password):
                raise serializers.ValidationError({
                    "current_password": "Current password is incorrect."
                })

            if not new_password:
                raise serializers.ValidationError({
                    "new_password": "New password is required."
                })

            if new_password != confirm_password:
                raise serializers.ValidationError({
                    "confirm_password": "Passwords do not match."
                })

            validate_password(new_password, user)

        return attrs