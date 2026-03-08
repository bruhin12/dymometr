const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Pusher = require('pusher-js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 100 / 67; // 67 KEKW do pełna
const DROP_SPEED = 5 / 60;   // Spadek 5% na sekundę

// --- KONFIGURACJA KICKA ---
const CHATROOM_ID = 31815171; // Twój ID
const pusher = new Pusher('eb1d5f2830c9ce35672d', {
    cluster: 'mt1',
    forceTLS: true
});

const channel = pusher.subscribe(`chatrooms.${CHATROOM_ID}.v2`);

channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    try {
        // Kick wysyła dane jako string JSON wewnątrz obiektu
        const chatData = JSON.parse(data.message);
        const content = chatData.content;
        
        console.log(`[CZAT] ${chatData.sender.username}: ${content}`);

        // Szukamy Twojej konkretnej emotki KEKW
        if (content.includes('377226:KEKW')) {
            currentLevel += KEKW_VALUE;
            if (currentLevel > 100) currentLevel = 100;
            
            console.log(`🔥 WYKRYTO KEKW! Nowy poziom: ${currentLevel.toFixed(1)}%`);
            broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
        }
    } catch (err) {
        console.error("Błąd odczytu wiadomości:", err);
    }
});

// Pętla płynności 60 FPS
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serwer dymometru aktywny na porcie ${PORT}`);
    console.log(`📡 Słucham czatu ID: ${CHATROOM_ID}`);
});
