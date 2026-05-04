# 🤖 IntellMeet – AI-Powered Enterprise Meeting Platform

> **Real-time video meetings + AI intelligence = Productive teams**

IntellMeet ek production-grade MERN stack application hai jo real-time video meetings, AI-powered summaries, smart action items, aur team collaboration ko ek jagah laata hai.

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 📹 HD Video Meetings | WebRTC-based real-time video conferencing |
| 🤖 AI Transcription | OpenAI Whisper se live speech-to-text |
| 📋 Auto Summaries | Meeting khatam hote hi AI summary generate karta hai |
| ✅ Smart Action Items | AI automatically tasks detect karta hai |
| 💬 Real-time Chat | Socket.io powered in-meeting chat |
| 📊 Kanban Board | Action items se directly tasks create karo |
| 📈 Analytics | Meeting productivity reports |
| 🔒 Secure | JWT auth, bcrypt, rate limiting, OWASP best practices |

---

## 🛠️ Tech Stack

### Frontend
- React 19 + JavaScript (Vite)
- Tailwind CSS v4
- Socket.io Client
- WebRTC API
- TanStack Query
- Zustand (State Management)

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io (Real-time)
- JWT + bcrypt (Auth)
- OpenAI API (AI Features)
- Redis (Caching)
- Cloudinary (File Storage)

### DevOps
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Prometheus + Grafana (Monitoring)

---

## 📁 Project Structure

```
intellmeet/
├── frontend/               # React app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand state
│   │   ├── services/       # API calls
│   │   └── socket/         # Socket.io client
│   └── index.html
│
├── backend/                # Node.js server
│   ├── server.js           # Entry point
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   │   ├── auth.js         # Login/Register
│   │   ├── meetings.js     # Meeting CRUD
│   │   ├── chat.js         # Chat history
│   │   ├── tasks.js        # Task management
│   │   ├── ai.js           # AI features
│   │   └── analytics.js    # Reports
│   ├── socket/             # Socket.io handlers
│   ├── middleware/         # Auth, error handling
│   └── .env.example
│
└── README.md
```

---

## ⚡ Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (local ya Atlas)
- OpenAI API key

### Backend Setup

```bash
cd backend
npm install

# .env file banao
cp .env.example .env
# .env mein apni API keys daalein

npm run dev
# Server port 5000 pe chalega
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App port 5173 pe chalega
```

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register    - Naya account banao
POST /api/auth/login       - Login karo
POST /api/auth/refresh     - Token refresh karo
POST /api/auth/logout      - Logout karo
```

### Meetings
```
POST   /api/meetings              - Nayi meeting banao
GET    /api/meetings              - Saari meetings dekho
GET    /api/meetings/:id          - Ek meeting dekho
POST   /api/meetings/:id/join     - Meeting join karo
PATCH  /api/meetings/:id/end      - Meeting khatam karo
```

### AI Features
```
POST /api/ai/summarize     - Meeting summary generate karo
POST /api/ai/transcribe    - Audio transcribe karo
```

---

## 📡 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Meeting room mein join karo |
| `user-joined` | Server → Room | Naya participant aaya |
| `chat-message` | Bidirectional | Real-time chat |
| `typing-start` | Client → Room | Typing indicator |
| `webrtc-offer` | Peer → Peer | WebRTC connection |
| `live-transcript` | Client → Room | Live transcription |
| `send-reaction` | Client → Room | Emoji reactions |
| `end-meeting` | Host → Room | Meeting khatam karo |

---

## 🔐 Security Features

- JWT access tokens (15 min expiry) + refresh tokens (7 days)
- bcrypt password hashing (12 rounds)
- Rate limiting on auth routes (10 req/15 min)
- Helmet.js HTTP security headers
- CORS configured properly
- Input validation aur sanitization
- No secrets committed to Git

---

## 🚀 Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Environment Variables (Production)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-string>
OPENAI_API_KEY=sk-...
```

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Latency | < 200ms |
| Concurrent Meetings | 10,000+ |
| Uptime SLA | 99.95% |
| AI Accuracy | > 85% |
| Page Load | < 3s |

---

## 👨‍💻 Built With ❤️ by Zidio Development

**Project:** IntellMeet – Web Development (MERN) Domain  
**Version:** 2.0 – Industry Edition  
**Date:** March 2026

---

*"Meetings are the biggest time killer in enterprises. IntellMeet transforms meetings into productive experiences — reducing follow-up time by 40-60%."*
