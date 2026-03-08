const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

let currentLevel = 0; 
const KEKW_VALUE = 1.5; // ok. 67 KEKW do pełna
const DROP_SPEED = 0.08; 

// --- BEZPOŚREDNIE POŁĄCZENIE Z KICK ---
const CHATROOM_ID = 31815171;
let kickSocket;

function connectToKick() {
    // Adres serwera Pusher dla Kicka
    kickSocket = new WebSocket('wss://ws-us2.pusher.com/app/eb1d5f2830c9ce35672d?protocol=7&client=js&version=8.3.0&flash=false');

    kickSocket.onopen = () => {
        console.log('🔌 Połączono bezpośrednio z serwerem Kick!');
        // Musimy wysłać prośbę o subskrypcję pokoju
        const subscribeMsg = JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `chatrooms.${CHATROOM_ID}.v2` }
        });
        kickSocket.send(subscribeMsg);
    };

    kickSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Sprawdzamy czy to wiadomość z czatu
        if (data.event === 'App\\Events\\ChatMessageEvent') {
            const chatData = JSON.parse(data.data);
            const content = chatData.message || chatData.content || "";
            
            console.log(`💬 [CZAT]: ${content}`);

            if (content.toUpperCase().includes('KEKW')) {
                currentLevel = Math.min(100, currentLevel + KEKW_VALUE);
                broadcast({ level: currentLevel, triggerEffect: currentLevel >= 100 });
            }
        }
    };

    kickSocket.onclose = () => {
        console.log('⚠️ Połączenie z Kick przerwane. Reconnect za 5s...');
        setTimeout(connectToKick, 5000);
    };

    kickSocket.onerror = (err) => console.error('❌ Błąd gniazda Kick:', err.message);
}

connectToKick();

// Pętla płynności i spadku
setInterval(() => {
    if (currentLevel > 0) {
        currentLevel = Math.max(0, currentLevel - DROP_SPEED);
        broadcast({ level: currentLevel });
    }
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
