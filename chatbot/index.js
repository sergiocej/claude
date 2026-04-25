import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Google Calendar ──────────────────────────────────────────────────────────

function getCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
  return google.calendar({ version: 'v3', auth });
}

async function createCalendarEvent({ client_name, client_phone, date, time, topic }) {
  const calendar = getCalendarClient();
  const tz = 'America/Argentina/Buenos_Aires';

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora

  const event = {
    summary: `Consulta: ${client_name}`,
    description: `📋 Motivo: ${topic}\n📞 Contacto: ${client_phone ?? 'no informado'}`,
    start: { dateTime: start.toISOString(), timeZone: tz },
    end: { dateTime: end.toISOString(), timeZone: tz },
  };

  const { data } = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
    requestBody: event,
  });

  return data;
}

// ─── Definición de herramientas para Claude ───────────────────────────────────

const TOOLS = [
  {
    name: 'schedule_appointment',
    description: `Agenda una consulta en el calendario del Dr. Cej.
Usá esta herramienta SOLO cuando el cliente haya confirmado explícitamente:
nombre, fecha (formato YYYY-MM-DD), hora (formato HH:MM) y motivo.
No la uses si falta algún dato — primero pedíselo al cliente.`,
    input_schema: {
      type: 'object',
      properties: {
        client_name: {
          type: 'string',
          description: 'Nombre completo del cliente',
        },
        client_phone: {
          type: 'string',
          description: 'Teléfono o usuario de Instagram/WhatsApp',
        },
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD, ej: 2024-05-20',
        },
        time: {
          type: 'string',
          description: 'Hora en formato HH:MM, ej: 10:00',
        },
        topic: {
          type: 'string',
          description: 'Motivo de la consulta (área legal y breve descripción)',
        },
      },
      required: ['client_name', 'date', 'time', 'topic'],
    },
  },
];

// ─── Prompt del sistema ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el asistente virtual del Dr. Sergio Iván Cej, abogado penalista y especialista en cibercrimen con Maestría en Ciberseguridad, radicado en San Nicolás de los Arroyos, Buenos Aires, Argentina. Atiendes consultas iniciales por Instagram y WhatsApp para el estudio jurídico Juris Consultas.

ÁREAS DE PRÁCTICA:
- Derecho Penal (delitos, causas penales, defensa penal)
- Ciberdelitos y Cibercrimen (estafas digitales, hackeo, grooming, sextorsión, acoso virtual)
- Derecho Laboral (despidos, accidentes laborales, ART)
- Derecho Civil (contratos, daños y perjuicios, familia)
- Ciudadanía Italiana y Española (trámites, documentación)

REGLAS IMPORTANTES:
- Saluda cordialmente y preséntate como asistente del Dr. Cej
- Escucha el problema con empatía y preguntas breves si necesitás más contexto
- Brindá información GENERAL sobre el área de práctica, nunca asesoramiento legal específico ni concreto
- Siempre derivá al Dr. Cej para un análisis formal del caso
- Si es una urgencia penal (persona detenida, imputada o citada), indicá que llame directamente de inmediato
- Respondé siempre en español, tono profesional pero accesible y humano
- Mensajes concisos (máximo 3-4 párrafos cortos, sin listas largas)
- Si preguntan por honorarios, explicá que varían según el caso y se evalúan en la consulta inicial

AGENDA DE CONSULTAS:
- Si el cliente quiere agendar una consulta, recopilá estos datos UNO POR UNO antes de confirmar:
  1. Nombre completo
  2. Fecha preferida (pedí que la escriba como día/mes/año, ej: 20/05/2024)
  3. Hora preferida (ej: 10:00)
  4. Motivo breve de la consulta
- Confirmá los datos con el cliente antes de usar la herramienta
- Tras agendar exitosamente, confirmale con un mensaje como: "✅ Listo, agendé tu consulta para el [fecha] a las [hora]. El Dr. Cej te va a estar esperando."
- Si la herramienta falla, disculpate y pedile que contacte al estudio directamente`;

// ─── Historial de conversaciones ─────────────────────────────────────────────

const conversations = new Map();

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  return conversations.get(userId);
}

// ─── Generación de respuesta con loop de herramientas ────────────────────────

async function generateReply(userId, userMessage) {
  const history = getHistory(userId);
  history.push({ role: 'user', content: userMessage });

  // Snapshot de los últimos 20 mensajes para la API
  const messages = history.slice(-20);

  // Loop: Claude puede pedir herramientas antes de responder al usuario
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text ?? '';
      history.push({ role: 'assistant', content: text });
      return text;
    }

    if (response.stop_reason === 'tool_use') {
      // Agregar la respuesta del asistente (con los bloques tool_use) al loop
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        let result;
        try {
          if (block.name === 'schedule_appointment') {
            const event = await createCalendarEvent(block.input);
            result = `Evento creado exitosamente. ID: ${event.id}`;
          } else {
            result = 'Herramienta desconocida';
          }
        } catch (err) {
          result = `Error al agendar: ${err.message}`;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }
}

// ─── Envío de mensajes ────────────────────────────────────────────────────────

async function sendInstagramMessage(recipientId, text) {
  const res = await fetch('https://graph.facebook.com/v19.0/me/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
      access_token: process.env.PAGE_ACCESS_TOKEN,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Instagram API error: ${JSON.stringify(err)}`);
  }

  return res.json();
}

async function sendWhatsAppMessage(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(err)}`);
  }

  return res.json();
}

async function markWhatsAppAsRead(messageId) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  }).catch(() => {});
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('Webhook verificado correctamente');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Token inválido');
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object !== 'instagram' && body.object !== 'whatsapp_business_account') {
    return res.status(404).send('Not found');
  }

  res.status(200).send('EVENT_RECEIVED');

  if (body.object === 'instagram') {
    await handleInstagram(body);
  } else {
    await handleWhatsApp(body);
  }
});

async function handleInstagram(body) {
  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (!event.message || event.message.is_echo) continue;

      const senderId = event.sender.id;
      const text = event.message.text;
      if (!text) continue;

      const userId = `ig_${senderId}`;
      console.log(`[IG] ${senderId}: ${text}`);

      try {
        const reply = await generateReply(userId, text);
        await sendInstagramMessage(senderId, reply);
        console.log(`[IG] Respuesta enviada a ${senderId}`);
      } catch (err) {
        console.error(`[IG] Error con ${senderId}:`, err.message);
      }
    }
  }
}

async function handleWhatsApp(body) {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;

      for (const msg of value.messages) {
        if (msg.type !== 'text') continue;

        const from = msg.from;
        const text = msg.text?.body;
        if (!text) continue;

        const userId = `wa_${from}`;
        console.log(`[WA] ${from}: ${text}`);

        markWhatsAppAsRead(msg.id);

        try {
          const reply = await generateReply(userId, text);
          await sendWhatsAppMessage(from, reply);
          console.log(`[WA] Respuesta enviada a ${from}`);
        } catch (err) {
          console.error(`[WA] Error con ${from}:`, err.message);
        }
      }
    }
  }
}

app.get('/', (_req, res) => {
  res.send('Juris Consultas Bot — funcionando ✓');
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
