const WebSocket = require("ws");
const express = require("express");
const http = require("http");

// --- KONFIGURACJA ---
const CHATROOM_ID = 31815171; // TWÓJ NOWY CHATROOM
const PORT = process.env.PORT || 10000;
let level = 0;
const MAX_LEVEL = 100;
const DECAY_SPEED = 2;       // ile % ubywa co sekundę (wolniej, żeby dym trzymał)
const KEKW_BOOST = 2;        // ile % dodaje jedno KEKW
const EFFECT_COOLDOWN = 10000; // 5 sekund przerwy między błyskami

let lastEffectTime = 0;

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcastLevel(triggerEffect = false) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ level, triggerEffect }));
        }
    });
}

// Opadanie poziomu
setInterval(() => {
    if (level > 0) {
        level -= DECAY_SPEED;
        if (level < 0) level = 0;
        broadcastLevel(false);
    }
}, 1000);

// --- POŁĄCZENIE Z KICK (STARY SPRAWDZONY SILNIK) ---
function connectToKick() {
    // Używamy klucza ze starego działającego kodu
    const kickWs = new WebSocket("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7");

    kickWs.on("open", () => {
        console.log("✅ Połączono z Kick! Czekam na KEKW...");
        kickWs.send(JSON.stringify({
            event: "pusher:subscribe",
            data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
        }));
    });

    kickWs.on("message", (data) => {
        const message = JSON.parse(data.toString());

        if (message.event === "App\\Events\\ChatMessageEvent") {
            const chatData = JSON.parse(message.data);
            const text = chatData.content || "";

            const matches = text.match(/kekw/gi);
            if (matches) {
                level += (matches.length * KEKW_BOOST);
                let triggerEffect = false;

                if (level >= MAX_LEVEL) {
                    level = MAX_LEVEL;
                    const currentTime = Date.now();
                    if (currentTime - lastEffectTime > EFFECT_COOLDOWN) {
                        triggerEffect = true;
                        lastEffectTime = currentTime;
                        console.log("💥 WYBUCH DYMU!");
                    }
                }

                console.log(`🔥 Poziom: ${level.toFixed(1)}% | Wiadomość: ${text}`);
                broadcastLevel(triggerEffect);
            }
        }
        
        // Obsługa ping-pong dla stabilności
        if (message.event === "pusher:ping") {
            kickWs.send(JSON.stringify({ event: "pusher:pong" }));
        }
    });

    kickWs.on("close", () => {
        console.log("⚠️ Rozłączono z Kick. Reconnect za 5s...");
        setTimeout(connectToKick, 5000);
    });

    kickWs.on("error", (err) => console.error("❌ Błąd Kick WS:", err.message));
}

connectToKick();

server.listen(PORT, () => {
    console.log(`🚀 SERWER DZIAŁA NA PORCIE ${PORT}`);
});


