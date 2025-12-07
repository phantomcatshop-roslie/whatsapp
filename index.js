// index.js – Phantom Cat WhatsApp bot
// Step 2: auto-send ONE template whenever someone messages the number.

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 Env vars from Render
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

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

    // Safety checks
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

    console.log("📩 Incoming message from", from);

    // 👉 Step 2: ALWAYS send the promo template back
    await sendOfferTemplate(from);

    return res.sendStatus(200);
  } catch (err) {
    console.error("Error in /webhook handler:", err.response?.data || err.message);
    return res.sendStatus(500);
  }
});

// --- Helper: send the offer template with flow button ---
async function sendOfferTemplate(to) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      // 🔴 CHANGE THIS to your real template name
      name: "trial1",
      language: {
        // 🔴 CHANGE THIS if your template uses "en_US" instead
        code: "en"
      }
      // No components needed because your template has no variables
    }
  };

  await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`
    }
  });

  console.log("✅ Sent template to", to);
}

// --- Start server (Render uses PORT env var) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Phantom Cat bot listening on port ${PORT}`);
});
