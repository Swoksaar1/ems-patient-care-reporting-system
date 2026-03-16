from django.db import models, transaction
from django.utils import timezone
import re


class Patient(models.Model):
    SEX_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
    ]

    first_name = models.CharField(max_length=120)
    middle_name = models.CharField(max_length=120, blank=True, default="")
    last_name = models.CharField(max_length=120, blank=True, default="")

    address = models.TextField(blank=True, default="")
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, default="male")
    weight = models.CharField(max_length=30, blank=True, default="")
    contact_number = models.CharField(max_length=40, blank=True, default="")

    chief_complaint = models.TextField()
    assessment = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        full_name = " ".join(
            part for part in [self.first_name, self.middle_name, self.last_name] if part
        ).strip()
        return full_name or self.first_name


class Report(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("reviewed", "Reviewed"),
        ("closed", "Closed"),
    ]

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    ambulance_body_no = models.CharField(max_length=60)
    call_no = models.CharField(max_length=60)
    case_no = models.CharField(max_length=20, unique=True, blank=True, null=True)

    patient_location = models.TextField(blank=True, default="")
    transported_to = models.TextField(blank=True, default="")

    doi = models.DateField(null=True, blank=True)
    toi = models.TimeField(null=True, blank=True)
    poi = models.TextField(blank=True, default="")
    moi = models.TextField(blank=True, default="")

    call_received_time = models.DateTimeField(null=True, blank=True)
    responded_time = models.DateTimeField(null=True, blank=True)
    arrived_scene_time = models.DateTimeField(null=True, blank=True)
    left_scene_time = models.DateTimeField(null=True, blank=True)
    arrived_hospital_time = models.DateTimeField(null=True, blank=True)
    back_in_service_time = models.DateTimeField(null=True, blank=True)

    intervention_notes = models.TextField(blank=True, default="")

    apgar_enabled = models.BooleanField(default=False)
    non_transport_enabled = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft"
    )

    attachment = models.ImageField(
        upload_to="reports/attachments/",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid_case_no(self):
        if not self.case_no:
            return False
        return bool(re.fullmatch(r"\d{2}-\d{4}", str(self.case_no)))

    def generate_case_no(self):
        year_short = str(timezone.now().year)[-2:]

        latest_report = (
            Report.objects.select_for_update()
            .filter(case_no__regex=rf"^{year_short}-\d{{4}}$")
            .order_by("-case_no")
            .first()
        )

        latest_number = 0
        if latest_report and latest_report.case_no:
            try:
                latest_number = int(latest_report.case_no.split("-")[1])
            except (IndexError, ValueError):
                latest_number = 0

        next_number = latest_number + 1
        return f"{year_short}-{next_number:04d}"

    def save(self, *args, **kwargs):
        if not self.is_valid_case_no():
            with transaction.atomic():
                self.case_no = self.generate_case_no()
                return super().save(*args, **kwargs)

        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.case_no} - {self.patient}"


class Vital(models.Model):
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="vitals"
    )

    time = models.DateTimeField(null=True, blank=True)
    bp = models.CharField(max_length=30, blank=True, default="")
    pulse_rate = models.CharField(max_length=30, blank=True, default="")
    resp_rate = models.CharField(max_length=30, blank=True, default="")
    resp_quality = models.CharField(max_length=40, blank=True, default="normal")

    temperature_value = models.CharField(max_length=30, blank=True, default="")
    temperature_state = models.CharField(max_length=30, blank=True, default="normal")

    spo2 = models.CharField(max_length=30, blank=True, default="")
    skin_color = models.CharField(max_length=30, blank=True, default="normal")
    pupils = models.CharField(max_length=30, blank=True, default="normal")
    cap_refill = models.CharField(max_length=30, blank=True, default="normal")

    location = models.CharField(max_length=120, blank=True, default="")

    def __str__(self):
        return f"Vital {self.id} for Report {self.report_id}"


class GCS(models.Model):
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="gcs"
    )

    eye_score = models.CharField(max_length=40, blank=True, default="")
    verbal_score = models.CharField(max_length=60, blank=True, default="")
    motor_score = models.CharField(max_length=40, blank=True, default="")
    total_score = models.IntegerField(default=0)

    def __str__(self):
        return f"GCS for Report {self.report_id}"


class APGAR(models.Model):
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="apgar"
    )

    appearance = models.CharField(max_length=80, blank=True, default="")
    pulse = models.CharField(max_length=40, blank=True, default="")
    grimace = models.CharField(max_length=80, blank=True, default="")
    activity = models.CharField(max_length=80, blank=True, default="")
    respiration = models.CharField(max_length=80, blank=True, default="")
    total_score = models.IntegerField(default=0)

    def __str__(self):
        return f"APGAR for Report {self.report_id}"


class NonTransport(models.Model):
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="non_transport"
    )
    reason = models.CharField(max_length=120, blank=True, default="")

    def __str__(self):
        return f"Non-Transport for Report {self.report_id}"


class Belongings(models.Model):
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="belongings"
    )

    items = models.TextField(blank=True, default="")
    turned_over_to = models.CharField(max_length=120, blank=True, default="")
    received_by = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Belongings for Report {self.report_id}"


class EmsCrew(models.Model):
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="ems_crew"
    )

    ems_in_charge = models.CharField(max_length=120, blank=True, default="")
    ems_assistant_1 = models.CharField(max_length=120, blank=True, default="")
    ems_assistant_2 = models.CharField(max_length=120, blank=True, default="")
    ems_operator = models.CharField(max_length=120, blank=True, default="")

    def __str__(self):
        return f"EMS Crew for Report {self.report_id}"


class ReceivingPhysicianNOD(models.Model):
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="receiving_physician_nod"
    )

    physician_nod = models.CharField(max_length=160, blank=True, default="")
    signature_data_url = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Receiving NOD for Report {self.report_id}"


class Incident(models.Model):
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="incident"
    )

    LOC_AWAKE = "awake"
    LOC_VERBAL = "verbal"
    LOC_PAIN = "pain"
    LOC_UNCONSCIOUS = "unconscious"

    LOC_CHOICES = [
        (LOC_AWAKE, "Awake"),
        (LOC_VERBAL, "Verbal"),
        (LOC_PAIN, "Pain"),
        (LOC_UNCONSCIOUS, "Unconscious"),
    ]

    level_of_consciousness = models.CharField(
        max_length=20,
        choices=LOC_CHOICES,
        default=LOC_AWAKE,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Incident for Report {self.report_id}"