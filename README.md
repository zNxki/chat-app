# Chat App

Applicazione di chat in tempo reale con architettura a tre livelli:
**PHP REST API** → **TypeScript Middleware** → **Frontend HTML nativo**

---

## Struttura del progetto

```
chat-app/
├── backend/
│   ├── php-api/                  ← REST API in PHP 8.1+
│   │   ├── composer.json
│   │   ├── index.php             ← entry point / router
│   │   └── src/
│   │       ├── Database/
│   │       │   └── Database.php  ← SQLite singleton + migrazioni
│   │       ├── Models/
│   │       │   ├── User.php
│   │       │   ├── Message.php
│   │       │   ├── Room.php
│   │       │   └── Reaction.php
│   │       ├── Services/
│   │       │   ├── AuthService.php   ← JWT register/login
│   │       │   └── RateLimiter.php   ← max 10 msg/minuto per utente
│   │       ├── Middleware/
│   │       │   └── JwtMiddleware.php ← verifica Bearer token
│   │       └── Controllers/
│   │           ├── AuthController.php
│   │           ├── MessageController.php
│   │           ├── RoomController.php
│   │           └── ReactionController.php
│   │
│   ├── ts-middleware/            ← Middleware in TypeScript / Node.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── server.ts         ← Express server (porta 3000)
│   │       ├── websocket.ts      ← WebSocket server (porta 3001)
│   │       ├── cache.ts          ← cache in memoria con TTL
│   │       ├── logger.ts         ← Winston logger su file + console
│   │       └── moderation.ts     ← ban utenti, parole vietate, avvisi
│   │
│   └── logs/
│       ├── combined.log
│       └── error.log
│
└── frontend/
    ├── index.html                ← HTML nativo
    ├── style.css                 ← tema dark/light con CSS variables
    └── script.js                 ← WebSocket client, Markdown, auth
```

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| REST API | PHP 8.1+, PDO, SQLite |
| Autenticazione | JWT (`firebase/php-jwt`) |
| Middleware | TypeScript, Node.js, Express |
| Real-time | WebSocket (`ws`) |
| Logging | Winston |
| Cache | In-memory con TTL |
| Frontend | HTML, CSS, JS nativi |
| Markdown | `marked.js` (CDN) |

---

## Prerequisiti

- PHP 8.1+
- Composer
- Node.js 18+
- npm

---

## Installazione

### 1. PHP API

```bash
cd backend/php-api
composer install
```

### 2. TypeScript Middleware

```bash
cd backend/ts-middleware
npm install
```

---

## Avvio

Apri **tre terminali** dalla root del progetto.

```bash
# Terminale 1 — PHP API (porta 8080)
cd backend/php-api
php -S localhost:8080 index.php

# Terminale 2 — TypeScript Middleware (porta 3000 + WS 3001)
cd backend/ts-middleware
npx ts-node src/server.ts

# Terminale 3 — Frontend (porta 5500)
cd frontend
php -S localhost:5500
```

Apri il browser su **http://localhost:5500**

---

## API Reference

### Auth

| Metodo | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/auth/register` | `{ username, password, color }` | No |
| POST | `/auth/login` | `{ username, password }` | No |

### Rooms

| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/rooms` | No |
| POST | `/rooms` | JWT |

### Messages

| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/messages?room=1` | No |
| POST | `/messages` | JWT |
| DELETE | `/messages/:id` | JWT |

### Reactions

| Metodo | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/reactions/:messageId` | `{ emoji }` | JWT |

### Moderazione

| Metodo | Endpoint | Body |
|---|---|---|
| POST | `/mod/ban` | `{ username }` |
| POST | `/mod/unban` | `{ username }` |
| GET | `/mod/banned` | — |

---

## Funzionalità

- Registrazione e login con JWT (scadenza 7 giorni)
- Stanze/canali multipli
- Messaggi in tempo reale via WebSocket
- Markdown nei messaggi (`**grassetto**`, `*corsivo*`, `` `codice` ``)
- Reazioni ai messaggi con emoji (👍 ❤️ 😂 😮 😢 🔥)
- Rate limiting (max 10 messaggi al minuto per utente)
- Sistema di moderazione con avvisi e ban automatico
- Cache in memoria per ridurre le chiamate a PHP
- Logging su file con Winston
- Lista utenti online per stanza
- Notifica sonora per nuovi messaggi
- Tema dark/light
- Auto-resize della textarea

---

## Note di sviluppo

Il database SQLite viene creato automaticamente al primo avvio in `backend/php-api/chat.db`.

La chiave JWT in `AuthService.php` deve essere sostituita con una stringa sicura di almeno 32 caratteri in produzione.

Il middleware TypeScript non espone mai direttamente la PHP API — tutto il traffico dal frontend passa per la porta 3000.