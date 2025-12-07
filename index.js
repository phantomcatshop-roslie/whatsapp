const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 These will come from Render environment variables
const VERIFY_TOKEN        = process.env.WHATSAPP_VERIFY_TOKEN;      // you choose this
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;    // long-lived token (but in ENV only)
const PHONE_NUMBER_ID     = process.env.WHATSAPP_PHONE_NUMBER_ID;   // e.g. 817181248154699
    // e.g. 817181248154699

// 1️⃣ Webhook verification (Meta calls this with GET once when you connect it)
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

// 2️⃣ Incoming messages (Meta sends POST here)
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    const change = body?.entry?.[0]?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    // Ignore non-message events
    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const msg = messages[0];
    const from = msg.from; // WhatsApp number like "9170xxxxxxx"

    // 💬 Your simple 3-option menu
    const replyText =
      "Hey! 👋\n" +
      "Here are some quick links:\n\n" +
      "1️⃣ Track your order: https://phantomcat.shop/apps/track\n" +
      "2️⃣ Refund / Exchange: https://phantomcat.shop/policies/refund-policy\n" +
      "3️⃣ View sale: https://phantomcat.shop/collections/sale\n\n" +
      "Reply to this message if you still need help.";

    // Send reply via WhatsApp Cloud API
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: replyText }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Sent menu to", from);
    return res.sendStatus(200);
  } catch (err) {
    console.error("Error handling webhook:", err.response?.data || err.message);
    return res.sendStatus(200); // Return 200 so Meta doesn't spam retries
  }
});

// 3️⃣ Simple health check
app.get("/", (_req, res) => {
  res.send("Phantom Cat WhatsApp bot is alive 🐈‍⬛");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot server listening on port ${PORT}`);
});
