const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const Pusher = require('pusher-js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

// --- KONFIGURACJA DYMOMETRU ---
let currentLevel = 0; 
const MAX_LEVEL = 100;
const KEKW_VALUE = 100 / 67; // 67 KEKW do pełna
const DROP_SPEED = 5 / 60;   // Spadek 5% na sekundę

// --- KONFIGURACJA KICKA ---
const CHATROOM_ID = 31815171; 
const pusher = new Pusher('eb1d5f2830c9ce35672d', {
    cluster: 'mt1',
    forceTLS: true
});

// Subskrypcja czatu
const channel = pusher.subscribe(`chatrooms.${CHATROOM_ID}.v2`);

console.log(`📡 Łączenie z czatem Kick (ID: ${CHATROOM_ID})...`);

channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    try {
        const chatData = JSON.parse(data.message);
        const content = chatData.content;
        
        // Szukamy Twojej emotki KEKW (ID: 377226)
        if (content.includes('377226:KEKW')) {
            currentLevel += KEKW_VALUE;
            if (currentLevel > MAX_LEVEL) currentLevel = MAX_LEVEL;
            
            console.log(`🔥 KEKW na czacie! Poziom: ${currentLevel.toFixed(1)}%`);
            broadcast({ level: currentLevel, triggerEffect: currentLevel >= MAX_LEVEL });
        }
    } catch (err) {
        console.error("Błąd przetwarzania wiadomości:", err);
    }
});

// Pętla płynności (60 FPS)
setInterval(() => {
    if (currentLevel > 0) {
        currentLevel -= DROP_SPEED;
        if (currentLevel < 0) currentLevel = 0;
        broadcast({ level: currentLevel });
    }
}, 1000 / 60);

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ level: currentLevel }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serwer dymometru działa na porcie ${PORT}`);
});
