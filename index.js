const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0;
const MAX_LEVEL = 100;
const KEKW_POINTS = 3.0; // Ile % za jedno KEKW
const DROP_SPEED = 0.05; // Jak szybko spada dymometr

const CHATROOM_ID = 31815171; 
let kickSocket;

// Funkcja wysyłająca dane do OBS
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// LOGIKA DODAWANIA PUNKTÓW (z Twojego starego kodu)
function addPoints(points) {
    currentLevel += points;
    if (currentLevel > MAX_LEVEL) currentLevel = MAX_LEVEL;
    
    console.log(`🔥 Poziom wzrósł do: ${currentLevel.toFixed(1)}%`);
    broadcast({ level: currentLevel });

    if (currentLevel === MAX_LEVEL) {
        broadcast({ triggerEffect: true });
    }
}

// POŁĄCZENIE Z CZATEM KICKA
function connectToKick() {
    // Łączymy się z klastrem us2 (poprawny dla Kicka)
    kickSocket = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f2830c9ce35672d?protocol=7&client=js&version=8.3.0');

    kickSocket.onopen = () => {
        console.log('✅ Połączono z serwerem Kick!');
        kickSocket.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
        }));
    };

    kickSocket.onmessage = (event) => {
        const raw = JSON.parse(event.data);
        
        // Jeśli to wiadomość z czatu
        if (raw.event === 'App\\Events\\ChatMessageEvent') {
            const chat = JSON.parse(raw.data);
            const msg = chat.content || "";
            
            if (msg.toUpperCase().includes('KEKW')) {
                addPoints(KEKW_POINTS);
            }
        }
    };

    kickSocket.onclose = () => {
        console.log('⚠️ Rozłączono z Kick. Reconnect...');
        setTimeout(connectToKick, 3000);
    };

    // PING co 20 sekund, żeby nas nie wyrzucało (naprawia Twój błąd z logów)
    setInterval(() => {
        if (kickSocket.readyState === WebSocket.OPEN) {
            kickSocket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        }
    }, 20000);
}

connectToKick();

// Pętla spadku (żeby dymometr powoli opadał)
setInterval(() => {
    if (currentLevel > 0) {
        currentLevel -= DROP_SPEED;
        broadcast({ level: currentLevel });
    }
}, 100);

wss.on('connection', (ws) => {
    console.log("✅ OBS połączony");
    ws.send(JSON.stringify({ level: currentLevel }));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 SERWER DZIAŁA NA PORCIE ${PORT}`);
});
