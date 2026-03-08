const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Pusher = require('pusher-js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 100 / 67; 
const DROP_SPEED = 5 / 60;   

// --- KONFIGURACJA KICKA ---
const CHATROOM_ID = 31815171; 
const pusher = new Pusher('eb1d5f2830c9ce35672d', {
    cluster: 'mt1',
    forceTLS: true
});

const channel = pusher.subscribe(`chatrooms.${CHATROOM_ID}.v2`);

channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    try {
        const chatData = JSON.parse(data.message);
        const content = chatData.content;
        
        // LOGOWANIE KAŻDEJ WIADOMOŚCI - Sprawdź to w konsoli Rendera!
        console.log(`💬 Odebrano: "${content}" od ${chatData.sender.username}`);

        // SPRAWDZANIE: Szukamy "KEKW" w dowolnej formie (tekst lub kod emotki)
        if (content.toUpperCase().includes('KEKW')) {
            currentLevel += KEKW_VALUE;
            if (currentLevel > 100) currentLevel = 100;
            
            console.log(`🔥 PUNKT! Aktualny poziom: ${currentLevel.toFixed(1)}%`);
            broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
        }
    } catch (err) {
        console.error("❌ Błąd krytyczny czatu:", err);
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
    console.log(`🚀 SERWER DYMOMETRU ONLINE`);
    console.log(`📡 SŁUCHAM CZATU ID: ${CHATROOM_ID}`);
});
