import anthropic
import json
from datetime import datetime
from zoneinfo import ZoneInfo
import calendar_service as cal

TZ = ZoneInfo("America/Argentina/Buenos_Aires")
_client = anthropic.Anthropic()

TOOLS = [
    {
        "name": "check_availability",
        "description": (
            "Consulta los turnos libres en Google Calendar del Dr. Cej. "
            "Devuelve hasta 6 horarios disponibles en los próximos días."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "days_ahead": {
                    "type": "integer",
                    "description": "Días hacia adelante a consultar (1–14). Default: 7.",
                }
            },
        },
    },
    {
        "name": "create_appointment",
        "description": (
            "Crea el turno en Google Calendar. "
            "Usar SOLO cuando el cliente haya confirmado explícitamente el horario."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {
                    "type": "string",
                    "description": "Nombre completo del cliente.",
                },
                "consultation_type": {
                    "type": "string",
                    "description": "Área: penal, laboral, civil, ciberdelitos, ciudadanía, otro.",
                },
                "datetime_iso": {
                    "type": "string",
                    "description": "Fecha y hora del turno en ISO 8601 (ej: 2025-04-29T10:00:00).",
                },
                "notes": {
                    "type": "string",
                    "description": "Breve descripción del caso (opcional).",
                },
            },
            "required": ["client_name", "consultation_type", "datetime_iso"],
        },
    },
]

SYSTEM_PROMPT = """\
Sos el asistente virtual del Dr. Sergio Iván Cej, abogado penalista de Juris Consultas, \
San Nicolás de los Arroyos, Buenos Aires.

Tu única función es gestionar el agendamiento de consultas jurídicas por WhatsApp. \
Respondé siempre en español rioplatense (vos/te), de forma cordial y concisa.

=== FLUJO DE AGENDAMIENTO ===
1. Saludá al cliente y, si no se presentó, pedí su nombre completo.
2. Preguntá el área de consulta: penal, ciberdelitos, laboral, civil, ciudadanía italiana/española, u otro.
3. Llamá a `check_availability` y ofrecé hasta 3 opciones numeradas con día, fecha y hora.
4. Cuando el cliente elija un horario y lo confirme, llamá a `create_appointment`.
5. Enviá un mensaje de confirmación con: nombre, área, fecha/hora y la aclaración de que \
el Dr. Cej se contactará antes para confirmar cualquier detalle.

=== REGLAS ===
- No brindes asesoramiento legal, solo gestioná el agendamiento.
- Si el mensaje no tiene que ver con reservar un turno (consulta urgente, pregunta legal, etc.), \
respondé que el Dr. Cej se comunicará directamente a la brevedad.
- Nunca confirmes un turno sin haber llamado antes a `create_appointment`.
- Duración de cada consulta: 60 minutos.
- Horarios: lunes a viernes 9–18 hs, sábados 9–13 hs (hora Argentina).
"""


def _run_tool(name: str, tool_input: dict, client_phone: str) -> str:
    try:
        if name == "check_availability":
            days = min(int(tool_input.get("days_ahead", 7)), 14)
            slots = cal.get_free_slots(days_ahead=days)
            if not slots:
                return json.dumps({"slots": [], "message": "No hay turnos disponibles en este período."})
            return json.dumps({
                "slots":     [cal.format_slot(s) for s in slots],
                "iso_slots": [s.isoformat() for s in slots],
            })

        if name == "create_appointment":
            raw_dt = tool_input["datetime_iso"]
            start_dt = datetime.fromisoformat(raw_dt)
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=TZ)

            event = cal.create_appointment(
                client_name=tool_input["client_name"],
                client_phone=client_phone,
                consultation_type=tool_input["consultation_type"],
                start_dt=start_dt,
                notes=tool_input.get("notes", ""),
            )
            return json.dumps({"success": True, "event_id": event.get("id")})

    except Exception as exc:
        return json.dumps({"error": str(exc)})

    return json.dumps({"error": f"Herramienta desconocida: {name}"})


def get_bot_response(history: list, client_phone: str) -> str:
    """
    Run the Claude agentic loop and return the final text reply.
    `history` is a list of {"role": "user"|"assistant", "content": str} dicts.
    """
    messages = list(history)

    while True:
        response = _client.messages.create(
            model="claude-opus-4-7",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        tool_uses  = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b for b in response.content if b.type == "text"]

        # No tool call → final answer
        if not tool_uses:
            if text_blocks:
                return text_blocks[0].text
            return "Lo siento, no pude procesar tu mensaje. Por favor intentá de nuevo."

        # Execute all tool calls, then loop
        messages.append({"role": "assistant", "content": response.content})
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": _run_tool(tu.name, tu.input, client_phone),
                }
                for tu in tool_uses
            ],
        })
