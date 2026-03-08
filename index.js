const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 2.0; // Zwiększyłem trochę, żeby było widać ruch
const DROP_SPEED = 0.05; 

const CHATROOM_ID = 31815171;
let kickSocket;
let heartbeatInterval;

function connectToKick() {
    // Łączymy się bezpośrednio z serwerem Pushera używanym przez Kick
    kickSocket = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f2830c9ce35672d?protocol=7&client=js&version=8.3.0&flash=false');

    kickSocket.onopen = () => {
        console.log('🔌 [SYSTEM] Połączono z serwerem Kick!');
        
        // 1. Subskrybujemy kanał
        kickSocket.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
        }));

        // 2. Startujemy Heartbeat (Ping), żeby nas nie rozłączało
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (kickSocket.readyState === WebSocket.OPEN) {
                kickSocket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
            }
        }, 30000); // Co 30 sekund
    };

    kickSocket.onmessage = (event) => {
        const response = JSON.parse(event.data);

        // Obsługa wiadomości z czatu
        if (response.event === 'App\\Events\\ChatMessageEvent') {
            const chatData = JSON.parse(response.data);
            const content = chatData.content || "";
            const sender = chatData.sender ? chatData.sender.username : "Anonim";

            console.log(`💬 [${sender}]: ${content}`);

            // Sprawdzamy KEKW (dowolna wielkość liter)
            if (content.toUpperCase().includes('KEKW')) {
                currentLevel = Math.min(100, currentLevel + KEKW_VALUE);
                console.log(`🔥 DYM! Poziom: ${currentLevel.toFixed(1)}%`);
                broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
            }
        }
    };

    kickSocket.onclose = () => {
        console.log('⚠️ [SYSTEM] Połączenie przerwane. Reconnect za 5s...');
        clearInterval(heartbeatInterval);
        setTimeout(connectToKick, 5000);
    };

    kickSocket.onerror = (err) => console.error('❌ [BŁĄD]:', err.message);
}

// Start połączenia
connectToKick();

// Pętla spadku dymu i wysyłania do OBS
setInterval(() => {
    if (currentLevel > 0) {
        currentLevel = Math.max(0, currentLevel - DROP_SPEED);
    }
    broadcast({ level: currentLevel });
}, 100);

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 SERWER DYMOMETRU GOTOWY NA PORCIE ${PORT}`);
});
