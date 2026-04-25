from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.responses import PlainTextResponse
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse
import os

import state
from agent import get_bot_response

RESET_WORDS = {"reiniciar", "reset", "nueva consulta", "empezar de nuevo"}

_validator = RequestValidator(os.environ.get("TWILIO_AUTH_TOKEN", ""))


def _twilio_reply(text: str) -> PlainTextResponse:
    resp = MessagingResponse()
    resp.message(text)
    return PlainTextResponse(str(resp), media_type="text/xml")


@asynccontextmanager
async def lifespan(app: FastAPI):
    state.init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.post("/webhook/whatsapp")
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
):
    # Validate Twilio signature in production
    if os.environ.get("VALIDATE_TWILIO_SIGNATURE", "false").lower() == "true":
        signature = request.headers.get("X-Twilio-Signature", "")
        form_data = dict(await request.form())
        if not _validator.validate(str(request.url), form_data, signature):
            raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    phone = From.replace("whatsapp:", "").strip()
    text  = Body.strip()

    if text.lower() in RESET_WORDS:
        state.clear_conversation(phone)
        return _twilio_reply("Conversación reiniciada. ¿En qué puedo ayudarte?")

    history = state.get_conversation(phone)
    history.append({"role": "user", "content": text})

    reply = get_bot_response(history, phone)

    history.append({"role": "assistant", "content": reply})
    state.save_conversation(phone, history)

    return _twilio_reply(reply)


@app.get("/health")
def health():
    return {"status": "ok"}
