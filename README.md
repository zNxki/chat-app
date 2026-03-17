# Chat App

A full-stack real-time chat application built with **PHP** (REST API), **TypeScript/Node.js** (middleware + WebSocket), and **vanilla HTML/CSS/JS** (frontend).

---

## Architecture

```
Browser (HTML/JS)
    ↓ HTTP + WebSocket
TypeScript Middleware (Express — port 3000 / WS port 3001)
    ↓ HTTP
PHP REST API (port 8080)
    ↓
SQLite Database
```

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | HTML, CSS, JS | UI, WebSocket client, Markdown rendering |
| Middleware | TypeScript + Express | Validation, caching, moderation, WebSocket broadcasting, logging |
| API | PHP 8.1+ | REST endpoints, JWT auth, rate limiting, SQLite |
| Database | SQLite | Users, rooms, messages, reactions, rate limits |

---

## Project Structure

```
chat-app/
├── backend/
│   ├── php-api/
│   │   ├── composer.json
│   │   ├── index.php                  # Router / entry point
│   │   └── src/
│   │       ├── Database.php           # PDO singleton + migrations
│   │       ├── Middleware/
│   │       │   └── JwtMiddleware.php  # JWT verification on protected routes
│   │       ├── Models/
│   │       │   ├── Message.php
│   │       │   ├── Reaction.php
│   │       │   ├── Room.php
│   │       │   └── User.php
│   │       ├── Controllers/
│   │       │   ├── AuthController.php
│   │       │   ├── MessageController.php
│   │       │   ├── ReactionController.php
│   │       │   └── RoomController.php
│   │       └── Services/
│   │           ├── AuthService.php    # JWT generation + bcrypt
│   │           └── RateLimiter.php    # Per-user per-minute limiting
│   │
│   └── ts-middleware/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── server.ts              # Express app + route forwarding
│           ├── websocket.ts           # WS server + room broadcasting
│           ├── cache.ts               # In-memory TTL cache
│           ├── moderation.ts          # Ban system + word filter
│           └── logger.ts              # Winston file + console logger
│
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

---

## Features

- **JWT authentication** — register/login, token stored in localStorage
- **Multiple rooms/channels** — create and switch between channels
- **Real-time messaging** — WebSocket push, no page refresh needed
- **Markdown support** — `**bold**`, `*italic*`, `` `code` ``, `~~strikethrough~~`
- **Message reactions** — 👍 ❤️ 😂 😮 😢 🔥 toggle reactions on any message
- **Rate limiting** — max 10 messages per user per minute (PHP-side)
- **Moderation** — ban/unban users, word filter with 3-strike system (TS-side)
- **In-memory cache** — message responses cached with 2s TTL to reduce PHP load
- **Winston logging** — all requests logged to `logs/combined.log` and `logs/error.log`
- **Online users list** — sidebar shows who is currently connected per room
- **Dark/light theme** — toggle via button in header
- **Notification sound** — Web Audio API beep on new messages from others
- **Delete own messages** — hover a message to reveal the delete button

---

## Requirements

- PHP 8.1+
- Composer
- Node.js 18+
- npm

---

## Setup & Running

### 1. PHP API

```bash
cd backend/php-api
composer install
composer dump-autoload
php -S localhost:8080 index.php
```

### 2. TypeScript Middleware

```bash
cd backend/ts-middleware
npm install
npx ts-node src/server.ts
```

### 3. Frontend

```bash
cd frontend
php -S localhost:5500
```

Then open **http://localhost:5500** in your browser.

> All three servers must be running at the same time.

---

## API Reference

All requests go through the middleware at `http://localhost:3000`.

### Auth

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ username, password, color }` | Register new user |
| POST | `/auth/login` | — | `{ username, password }` | Login, returns JWT |

### Rooms

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/rooms` | — | List all rooms |
| POST | `/rooms` | JWT | Create a new room |

### Messages

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/messages?room=1` | — | Get messages in a room |
| POST | `/messages` | JWT | Send a message |
| DELETE | `/messages/:id` | JWT | Delete own message |

### Reactions

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/reactions/:messageId` | JWT | `{ emoji, room }` | Toggle a reaction |

### Moderation

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/mod/ban` | `{ username }` | Ban a user |
| POST | `/mod/unban` | `{ username }` | Unban a user |
| GET | `/mod/banned` | — | List banned users |

### Online Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/online?room=1` | Get online users in a room |

---

## WebSocket

Connect to `ws://localhost:3001`.

**Join a room:**
```json
{ "type": "join", "username": "znxki", "color": "#e8c547", "room": 1 }
```

**Incoming events:**

| Type | Payload | Description |
|---|---|---|
| `message` | `{ message: {...} }` | New message in the room |
| `delete` | `{ id: number }` | Message deleted |
| `reaction` | `{ messageId: number }` | Reaction toggled |
| `online` | `{ users: string[] }` | Updated online user list |

---

## Environment Notes

- The SQLite database `chat.db` is auto-created in `backend/php-api/` on first run.
- Logs are written to `logs/combined.log` and `logs/error.log` (created automatically).
- The JWT secret is hardcoded in `AuthService.php` — change it before any real deployment.
- Rate limiting resets every minute, stored in the `rate_limits` SQLite table.