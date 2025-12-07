// index.js – Phantom Cat WhatsApp bot

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Env vars from Render
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Simple memory: last time we sent the template to each user
// { "<phone>": timestamp }
const lastTemplateSentAt = {};

// --- Health check ---
app.get("/", (req, res) => {
  res.send("Phantom Cat WhatsApp bot is running 😼");
});

// --- Webhook verification (Meta calls this once when you connect it) ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    return res.sendStatus(403);
  }
});

// --- Incoming messages ---
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (!body.object || !body.entry || !body.entry[0].changes) {
      return res.sendStatus(200);
    }

    const change = body.entry[0].changes[0];
    const value = change.value || {};
    const messages = value.messages || [];

    if (!messages[0]) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message.from; // WhatsApp user phone (international format)

    console.log("📩 Incoming message from", from, "type:", message.type);

    // Only send template once per 24 hours per user
    const now = Date.now();
    const last = lastTemplateSentAt[from] || 0;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (now - last < TWENTY_FOUR_HOURS) {
      console.log("⏭️  Template already sent to", from, "within 24h – skipping.");
      return res.sendStatus(200);
    }

    await sendOfferTemplate(from);
    lastTemplateSentAt[from] = now;

    return res.sendStatus(200);
  } catch (err) {
    console.error(
      "Error in /webhook handler:",
      err.response?.data || err.message
    );
    return res.sendStatus(500);
  }
});

// --- Helper: send the offer template ---
async function sendOfferTemplate(to) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      // 👇 EXACT template name from WhatsApp Manager
      name: "whatsapp_bot1",
      language: {
        // If Manager shows English (US) / en_US, change this to "en_US"
        code: "en"
      }
    }
  };

  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`
    }
  });

  console.log("✅ Sent template to", to, "message id:", response.data.messages?.[0]?.id);
}

// --- Start server (Render uses PORT env var) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Phantom Cat bot listening on port ${PORT}`);
});
