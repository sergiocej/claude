import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
- Cierra siempre con una invitación a agendar consulta con el Dr. Cej`;

// Historial de conversaciones por usuario (en memoria, se resetea al reiniciar)
const conversations = new Map();

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  return conversations.get(userId);
}

async function generateReply(userId, userMessage) {
  const history = getHistory(userId);
  history.push({ role: 'user', content: userMessage });

  // Mantener últimos 20 mensajes para controlar el contexto
  const recentHistory = history.slice(-20);

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: recentHistory,
  });

  const reply = response.content.find(b => b.type === 'text')?.text ?? '';
  history.push({ role: 'assistant', content: reply });

  return reply;
}

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
  }).catch(() => {}); // No crítico si falla
}

// Verificación del webhook de Meta
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

// Recepción de mensajes entrantes
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object !== 'instagram' && body.object !== 'whatsapp_business_account') {
    return res.status(404).send('Not found');
  }

  // Responder 200 inmediatamente para que Meta no reintente
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

        const from = msg.from; // número de teléfono
        const text = msg.text?.body;
        if (!text) continue;

        const userId = `wa_${from}`;
        console.log(`[WA] ${from}: ${text}`);

        // Marcar como leído (muestra el doble check azul)
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
