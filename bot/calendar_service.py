from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import os
import json

TZ = ZoneInfo("America/Argentina/Buenos_Aires")
SCOPES = ["https://www.googleapis.com/auth/calendar"]

# Mon–Fri: 9–18, Sat: 9–13, Sun: closed
OFFICE_HOURS = {0: (9, 18), 1: (9, 18), 2: (9, 18), 3: (9, 18), 4: (9, 18), 5: (9, 13)}

DIAS_ES = {
    0: "lunes", 1: "martes", 2: "miércoles",
    3: "jueves", 4: "viernes", 5: "sábado", 6: "domingo",
}


def _get_service():
    creds = Credentials(
        token=None,
        refresh_token=os.environ["GOOGLE_REFRESH_TOKEN"],
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return build("calendar", "v3", credentials=creds)


def get_free_slots(days_ahead: int = 7, slot_minutes: int = 60, max_slots: int = 6) -> list[datetime]:
    """Return up to max_slots available datetimes (Argentina TZ)."""
    service = _get_service()
    calendar_id = os.environ.get("GOOGLE_CALENDAR_ID", "primary")

    now = datetime.now(tz=TZ)
    # Start from the next full hour
    start = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(days=days_ahead)

    freebusy = service.freebusy().query(body={
        "timeMin": start.isoformat(),
        "timeMax": end.isoformat(),
        "timeZone": "America/Argentina/Buenos_Aires",
        "items": [{"id": calendar_id}],
    }).execute()

    busy_raw = freebusy["calendars"][calendar_id]["busy"]
    busy = [
        (
            datetime.fromisoformat(b["start"].replace("Z", "+00:00")).astimezone(TZ),
            datetime.fromisoformat(b["end"].replace("Z", "+00:00")).astimezone(TZ),
        )
        for b in busy_raw
    ]

    available: list[datetime] = []
    current = start

    while current < end and len(available) < max_slots:
        wd = current.weekday()

        if wd not in OFFICE_HOURS:          # Sunday
            current = (current + timedelta(days=1)).replace(hour=9, minute=0)
            continue

        open_h, close_h = OFFICE_HOURS[wd]

        if current.hour < open_h:
            current = current.replace(hour=open_h, minute=0)
            continue

        if current.hour >= close_h:
            current = (current + timedelta(days=1)).replace(hour=9, minute=0)
            continue

        slot_end = current + timedelta(minutes=slot_minutes)

        # Slot must finish before closing time
        if slot_end.hour > close_h or (slot_end.hour == close_h and slot_end.minute > 0):
            current = (current + timedelta(days=1)).replace(hour=9, minute=0)
            continue

        if not any(current < be and slot_end > bs for bs, be in busy):
            available.append(current)

        current += timedelta(minutes=30)

    return available


def format_slot(dt: datetime) -> str:
    return f"{DIAS_ES[dt.weekday()]} {dt.day:02d}/{dt.month:02d} a las {dt.hour:02d}:{dt.minute:02d}"


def create_appointment(
    client_name: str,
    client_phone: str,
    consultation_type: str,
    start_dt: datetime,
    notes: str = "",
    slot_minutes: int = 60,
) -> dict:
    """Create a Google Calendar event and return the event dict."""
    service = _get_service()
    calendar_id = os.environ.get("GOOGLE_CALENDAR_ID", "primary")

    end_dt = start_dt + timedelta(minutes=slot_minutes)
    lines = [
        f"Cliente: {client_name}",
        f"Teléfono: {client_phone}",
        f"Tipo de consulta: {consultation_type}",
    ]
    if notes:
        lines.append(f"Notas: {notes}")

    event = {
        "summary": f"Consulta – {client_name} ({consultation_type})",
        "description": "\n".join(lines),
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "America/Argentina/Buenos_Aires"},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": "America/Argentina/Buenos_Aires"},
        "colorId": "5",  # banana – stands out in calendar
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 30},
                {"method": "email", "minutes": 60},
            ],
        },
    }

    return service.events().insert(calendarId=calendar_id, body=event).execute()
