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

const CHATROOM_ID = 31815171; 

// Konfiguracja Pushera z wymuszonym utrzymaniem połączenia
const pusher = new Pusher('eb1d5f2830c9ce35672d', {
    cluster: 'mt1',
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    activityTimeout: 120000, // 2 minuty przed timeoutem
    pongTimeout: 30000       // 30 sekund na odpowiedź
});

const channel = pusher.subscribe(`chatrooms.${CHATROOM_ID}.v2`);

// Monitorowanie statusu w logach Rendera
pusher.connection.bind('state_change', (states) => {
    console.log(`🔌 [POŁĄCZENIE] Zmiana statusu: ${states.previous} -> ${states.current}`);
});

pusher.connection.bind('error', (err) => {
    console.error('❌ [BŁĄD PUSHERA]:', err);
});

channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    try {
        // Kick czasem wysyła string, czasem obiekt - obsłużmy oba przypadki
        const chatData = (typeof data.message === 'string') ? JSON.parse(data.message) : data;
        const content = chatData.content || "";
        const sender = chatData.sender ? chatData.sender.username : "Anonim";

        // Logowanie w konsoli Rendera dla pewności
        console.log(`💬 [${sender}]: ${content}`);

        // Reakcja na KEKW (duże/małe litery)
        if (content.toUpperCase().includes('KEKW')) {
            currentLevel += KEKW_VALUE;
            if (currentLevel > 100) currentLevel = 100;
            
            console.log(`🔥 KEKW WYKRYTE! Nowy poziom: ${currentLevel.toFixed(1)}%`);
            broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
        }
    } catch (err) {
        console.error("❌ Błąd przy odbieraniu wiadomości:", err);
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

const PORT = process.env.PORT || 10000; // Render używa 10000
server.listen(PORT, () => {
    console.log(`🚀 SERWER DYMOMETRU ONLINE NA PORCIE ${PORT}`);
});
