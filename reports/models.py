from django.db import models


class Patient(models.Model):
    SEX_NA = "na"
    SEX_MALE = "male"
    SEX_FEMALE = "female"

    SEX_CHOICES = [
        (SEX_NA, "N/A"),
        (SEX_MALE, "Male"),
        (SEX_FEMALE, "Female"),
    ]

    full_name = models.CharField(max_length=255, blank=True, default="")
    age = models.CharField(max_length=3, blank=True, default="")
    address = models.TextField(blank=True, default="")
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, default=SEX_NA)
    contact_number = models.CharField(max_length=40, blank=True, default="")

    chief_complaint = models.TextField(blank=True, default="")
    assessment = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name or "Unnamed Patient"


class Report(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("reviewed", "Reviewed"),
        ("closed", "Closed"),
    ]

    CASE_TYPE_CHOICES = [
        ("medical", "Medical"),
        ("trauma", "Trauma"),
        ("interfacility", "Interfacility"),
        ("hostran", "Hostran"),
        ("standby_medics", "Standby Medics"),
        ("back_to_base", "Back to Base"),
    ]

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    case_no = models.CharField(max_length=100, blank=True, default="")
    ambulance_body_no = models.CharField(max_length=60, blank=True, default="")
    case_type = models.CharField(
        max_length=30,
        choices=CASE_TYPE_CHOICES,
        default="medical",
        blank=True,
    )

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

    def __str__(self):
        return f"Report {self.id} - {self.patient}"


class Vital(models.Model):
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="vitals"
    )

    time = models.DateTimeField(null=True, blank=True)
    bp = models.CharField(max_length=30, blank=True, default="")
    pulse_rate = models.CharField(max_length=30, blank=True, default="")
    pulse_status = models.CharField(max_length=40, blank=True, default="na")
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

    LOC_NA = "na"
    LOC_AWAKE = "awake"
    LOC_VERBAL = "verbal"
    LOC_PAIN = "pain"
    LOC_UNCONSCIOUS = "unconscious"

    LOC_CHOICES = [
        (LOC_NA, "N/A"),
        (LOC_AWAKE, "Awake"),
        (LOC_VERBAL, "Verbal"),
        (LOC_PAIN, "Pain"),
        (LOC_UNCONSCIOUS, "Unconscious"),
    ]

    level_of_consciousness = models.CharField(
        max_length=20,
        choices=LOC_CHOICES,
        default=LOC_NA,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Incident for Report {self.report_id}"