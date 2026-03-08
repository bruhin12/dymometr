const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 3.0; // 3% za każde KEKW
const DROP_SPEED = 0.05; 

const CHATROOM_ID = 31815171;
let kickSocket;
let heartbeatInterval;

function connectToKick() {
    // Łączymy się bezpośrednio z serwerem Pushera
    kickSocket = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f2830c9ce35672d?protocol=7&client=js&version=8.3.0&flash=false');

    kickSocket.onopen = () => {
        console.log('🔌 [SYSTEM] Połączono z serwerem Kick!');
        
        kickSocket.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
        }));

        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (kickSocket.readyState === WebSocket.OPEN) {
                kickSocket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
            }
        }, 30000);
    };

    kickSocket.onmessage = (event) => {
        const response = JSON.parse(event.data);

        // SPRAWDZANIE DANYCH - REAGUJEMY NA KAŻDĄ WIADOMOŚĆ
        if (response.data) {
            // Zamieniamy całą paczkę danych na tekst, żeby szukać w niej KEKW
            const rawDataText = JSON.stringify(response.data).toUpperCase();

            if (rawDataText.includes('KEKW')) {
                currentLevel = Math.min(100, currentLevel + KEKW_VALUE);
                console.log(`🔥 WYKRYTO KEKW! Poziom: ${currentLevel.toFixed(1)}%`);
                broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
            }
        }
    };

    kickSocket.onclose = () => {
        console.log('⚠️ [SYSTEM] Rozłączono. Reconnect za 5s...');
        setTimeout(connectToKick, 5000);
    };
}

connectToKick();

// Pętla wysyłająca dane do OBS (60 FPS)
setInterval(() => {
    if (currentLevel > 0) {
        currentLevel = Math.max(0, currentLevel - DROP_SPEED);
    }
    broadcast({ level: currentLevel });
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
    console.log(`🚀 SERWER ONLINE NA PORCIE ${PORT}`);
});
