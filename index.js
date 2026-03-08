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
    forceTLS: true,
    enabledTransports: ['ws', 'wss'] // Wymuszamy konkretne protokoły
});

const channel = pusher.subscribe(`chatrooms.${CHATROOM_ID}.v2`);

// Test połączenia
pusher.connection.bind('state_change', (states) => {
    console.log(`🔌 Status połączenia z Kick: ${states.current}`);
});

channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    try {
        // Czasami dane przychodzą już jako obiekt, nie trzeba ich parsować drugi raz
        const chatData = (typeof data.message === 'string') ? JSON.parse(data.message) : data;
        const content = chatData.content || "";
        const sender = chatData.sender ? chatData.sender.username : "Anonim";

        console.log(`💬 [CZAT] ${sender}: ${content}`);

        // Reagujemy na KEKW (tekst lub emotka)
        if (content.toUpperCase().includes('KEKW')) {
            currentLevel += KEKW_VALUE;
            if (currentLevel > 100) currentLevel = 100;
            
            console.log(`🔥 PUNKT! Nowy poziom: ${currentLevel.toFixed(1)}%`);
            broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
        }
    } catch (err) {
        console.error("❌ Błąd przetwarzania wiadomości:", err);
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
    console.log(`🚀 SERWER DYMOMETRU ONLINE NA PORCIE ${PORT}`);
});
