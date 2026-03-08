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

// --- KONFIGURACJA KICKA (DANE ZWERYFIKOWANE) ---
const CHATROOM_ID = 31815171; 
const pusher = new Pusher('eb1d5f2830c9ce35672d', {
    cluster: 'us2', // To jest kluczowe dla Kicka
    forceTLS: true
});

const channel = pusher.subscribe(`chatrooms.${CHATROOM_ID}.v2`);

// Powiadomienie w logach o sukcesie połączenia
channel.bind('pusher:subscription_succeeded', () => {
    console.log(`✅ POŁĄCZONO! Słucham czatu ID: ${CHATROOM_ID}`);
});

channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    try {
        const chatData = (typeof data.message === 'string') ? JSON.parse(data.message) : data;
        const content = chatData.content || "";
        
        // Logowanie każdej wiadomości w konsoli Rendera (do testów)
        console.log(`💬 [${chatData.sender.username}]: ${content}`);

        // Reakcja na KEKW (duże i małe litery)
        if (content.toUpperCase().includes('KEKW')) {
            currentLevel += KEKW_VALUE;
            if (currentLevel > 100) currentLevel = 100;
            
            console.log(`🔥 KEKW! Poziom: ${currentLevel.toFixed(1)}%`);
            broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
        }
    } catch (err) {
        console.error("❌ Błąd danych:", err);
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 DYMOMETR DZIAŁA NA PORCIE ${PORT}`);
});
