const API = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('username');
let currentColor = localStorage.getItem('color') || '#e8c547';
let currentRoom = 1;
let currentRoomName = 'generale';
let ws = null;
let lastIds = new Set();
let authTab = 'login';

const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const formatTime = d => new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

const playNotif = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
};

const toast = (msg, type = 'error') => {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    setTimeout(() => el.classList.remove('show'), 3000);
};

const switchTab = (tab) => {
    authTab = tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab:${tab === 'login' ? 'first-child' : 'last-child'}`).classList.add('active');
    document.getElementById('color-field').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('auth-error').textContent = '';
};

const doAuth = async () => {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const color = document.getElementById('auth-color').value;

    const body = authTab === 'register' ? { username, password, color } : { username, password };

    const res = await fetch(`${API}/auth/${authTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.error) {
        document.getElementById('auth-error').textContent = data.error;
        return;
    }

    token = data.token;
    currentUser = username;
    currentColor = color;
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('color', color);

    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    document.getElementById('header-user').textContent = username;
    document.getElementById('header-user').style.color = color;

    initApp();
};

const logout = () => {
    localStorage.clear();
    if (ws) ws.close();
    location.reload();
};

const toggleTheme = () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
};

const connectWs = () => {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'join',
            username: currentUser,
            color: currentColor,
            room: currentRoom
        }));
    };

    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);

        if (msg.type === 'message') {
            if (!lastIds.has(msg.message.id)) {
                appendMessage(msg.message);
                lastIds.add(msg.message.id);
                if (msg.message.username !== currentUser) playNotif();
            }
        }
        if (msg.type === 'delete') {
            document.querySelector(`[data-id="${msg.id}"]`)?.remove();
            lastIds.delete(msg.id);
        }
        if (msg.type === 'online') {
            renderOnline(msg.users);
        }
        if (msg.type === 'reaction') {
            refreshReactions(msg.messageId);
        }
    };

    ws.onclose = () => setTimeout(connectWs, 3000);
};

const loadRooms = async () => {
    const res = await fetch(`${API}/rooms`);
    const rooms = await res.json();
    const el = document.getElementById('room-list');
    el.innerHTML = rooms.map(r => `
        <div class="room-item ${r.id === currentRoom ? 'active' : ''}"
             onclick="switchRoom(${r.id}, '${r.name}')">
            ${r.name}
        </div>
    `).join('');
};

const createRoom = async () => {
    const input = document.getElementById('new-room-input');
    const name = input.value.trim();
    if (!name) return;

    const res = await fetch(`${API}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.error) { toast(data.error); return; }
    input.value = '';
    loadRooms();
};

const switchRoom = (id, name) => {
    currentRoom = id;
    currentRoomName = name;
    lastIds.clear();
    document.getElementById('header-room').textContent = `#${name}`;
    document.getElementById('messages').innerHTML = '<p class="empty" id="empty-msg">nessun messaggio ancora</p>';
    loadMessages();
    loadRooms();
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'join', username: currentUser, color: currentColor, room: id }));
    }
};

const renderMarkdown = text => marked.parse(text, { breaks: true, gfm: true });

const appendMessage = (msg) => {
    const empty = document.getElementById('empty-msg');
    if (empty) empty.remove();

    const isOwn = msg.username === currentUser;
    const div = document.createElement('div');
    div.className = `msg ${isOwn ? 'own' : 'other'}`;
    div.dataset.id = msg.id;

    const reactions = (msg.reactions || []).map(r =>
        `<button class="reaction-btn" onclick="toggleReaction(${msg.id}, '${r.emoji}')">
            ${r.emoji} <span>${r.count}</span>
        </button>`
    ).join('');

    div.innerHTML = `
        <div class="msg-header">
            <span style="color:${msg.color}">${escHtml(msg.username)}</span>
            <span>${formatTime(msg.created_at)}</span>
        </div>
        <div class="msg-bubble">
            ${renderMarkdown(msg.text)}
            ${isOwn ? `<button class="msg-delete" onclick="deleteMsg(${msg.id})">✕</button>` : ''}
        </div>
        <div class="msg-reactions" id="reactions-${msg.id}">
            ${reactions}
            <div style="position:relative">
                <button class="add-reaction" onclick="togglePicker(${msg.id})">+</button>
                <div class="emoji-picker" id="picker-${msg.id}" style="display:none">
                    ${EMOJIS.map(e => `<span class="emoji-opt" onclick="toggleReaction(${msg.id},'${e}');togglePicker(${msg.id})">${e}</span>`).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = 99999;
};

const loadMessages = async () => {
    try {
        const res = await fetch(`${API}/messages?room=${currentRoom}`);
        const msgs = await res.json();
        msgs.filter(m => !lastIds.has(m.id)).forEach(m => {
            appendMessage(m);
            lastIds.add(m.id);
        });
    } catch {
        document.getElementById('header-room').style.color = 'var(--danger)';
    }
};

const sendMessage = async () => {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;

    document.getElementById('send-btn').disabled = true;
    try {
        const res = await fetch(`${API}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username: currentUser, text, room: currentRoom, color: currentColor })
        });
        const data = await res.json();
        if (data.error) { toast(data.error); return; }
        input.value = '';
        input.style.height = '40px';
    } catch {
        toast('errore di rete');
    } finally {
        document.getElementById('send-btn').disabled = false;
    }
};

const deleteMsg = async (id) => {
    await fetch(`${API}/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

const toggleReaction = async (messageId, emoji) => {
    await fetch(`${API}/reactions/${messageId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji, room: currentRoom })
    });
};

const refreshReactions = async (messageId) => {
    const res = await fetch(`${API}/messages?room=${currentRoom}`);
    const msgs = await res.json();
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return;
    const el = document.getElementById(`reactions-${messageId}`);
    if (!el) return;
    const reactions = (msg.reactions || []).map(r =>
        `<button class="reaction-btn" onclick="toggleReaction(${messageId}, '${r.emoji}')">
            ${r.emoji} <span>${r.count}</span>
        </button>`
    ).join('');
    el.innerHTML = reactions + (el.querySelector('div') ? el.querySelector('div').outerHTML : '');
};

const togglePicker = (id) => {
    const picker = document.getElementById(`picker-${id}`);
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
};

const renderOnline = (users) => {
    const el = document.getElementById('online-list');
    if (!el) return;
    el.innerHTML = users.map(u =>
        `<div class="online-user"><span class="online-dot"></span>${escHtml(u)}</div>`
    ).join('');
};

const initApp = () => {
    loadRooms();
    loadMessages();
    connectWs();
    setInterval(loadMessages, 5000);
};

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('msg-input');
    input.addEventListener('input', () => {
        input.style.height = '40px';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Se già loggato
    if (token && currentUser) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        document.getElementById('header-user').textContent = currentUser;
        document.getElementById('header-user').style.color = currentColor;
        initApp();
    }
});