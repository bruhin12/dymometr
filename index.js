const WebSocket = require("ws");
const express = require("express");
const path = require("path");
const http = require("http");

// --- KONFIGURACJA ---
const CHATROOM_ID = 29369738; // UPEWNIJ SIĘ, ŻE TO TWOJE ID
const PORT = process.env.PORT || 3000;
let level = 0;
const MAX_LEVEL = 100;
const DECAY_SPEED = 5;       // ile % ubywa co sekundę
const KEKW_BOOST = 10;       // ile % dodaje jedno KEKW
const EFFECT_COOLDOWN = 15000; // 15 sekund przerwy między efektami

let lastEffectTime = 0;

// --- SERWER DLA OBS ---
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

// Opadanie co sekundę
setInterval(() => {
    if (level > 0) {
        level -= DECAY_SPEED;
        if (level < 0) level = 0;
        broadcastLevel(false);
    }
}, 1000);

// --- POŁĄCZENIE Z KICK ---
function connectToKick() {
    const kickWs = new WebSocket("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7");

    kickWs.on("open", () => {
        console.log("✅ Połączono z Kick! Czekam na KEKW...");
    });

    kickWs.on("message", (data) => {
        const message = JSON.parse(data.toString());

        if (message.event === "pusher:connection_established") {
            kickWs.send(JSON.stringify({
                event: "pusher:subscribe",
                data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
            }));
        }

        if (message.event === "App\\Events\\ChatMessageEvent") {
            const chatData = JSON.parse(message.data);
            const text = chatData.content;

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
                        console.log("💥 WYBUCH SPECJALNY!");
                    }
                }

                console.log(`🔥 Poziom: ${level}%`);
                broadcastLevel(triggerEffect);
            }
        }
    });

    kickWs.on("close", () => setTimeout(connectToKick, 5000));
}

connectToKick();
server.listen(PORT, () => {
    console.log(`⭐ Serwer działa! Adres do OBS: http://localhost:${PORT}/overlay.html`);

});
