# LearnLoop AI — Core MVP

LearnLoop AI is an intelligent MERN-based learning platform that transforms video lectures into interactive, bite-sized mastery modules. A user pastes a lecture URL, and LearnLoop extracts the transcript, splits it into digestible chunks, generates comprehensive study notes (summaries, key concepts, takeaways, flashcards), and creates interactive quizzes. Users must score at least 75% on a chunk quiz to unlock the next chunk, enforcing progressive mastery.

---

## Features

- **Authentication & Security:**
  - Secure user registration and login with bcryptjs password hashing and JWT token issuance.
  - Client-side auth state with automatic bearer token attachment and protected routes.
- **Lecture Ingestion & Transcription:**
  - Accepts YouTube lecture URLs with validation and metadata extraction via oEmbed.
  - Automatic caption/transcript extraction with time-coded segment mapping.
- **Intelligent Chunking:**
  - Breaks lectures into 5-minute logical segments based on transcript timestamps and sentence boundaries.
- **AI-Powered Learning Materials (Google Gemini):**
  - Integrated via `@google/generative-ai` (`gemini-2.0-flash`).
  - Isolated AI service with automated fallback generation for development and resilient operation.
  - Generates concise section title, multi-paragraph summary, key concepts, key takeaways, and 5 interactive flashcards per chunk.
- **Mastery Gating & Quizzes:**
  - Generates 5 multiple-choice questions per chunk testing comprehension.
  - Real-time quiz submission, score calculation, and question-by-question explanations.
  - Chunk 1 unlocked by default; Chunk $N$ unlocks strictly upon achieving $\ge 75\%$ score on Chunk $N-1$.
- **Modern Dark UI Design:**
  - Cyberpunk-inspired dark aesthetic with glassmorphism navigation, gradient accents, interactive 3D flashcard flips, responsive layouts, and progress tracking.

---

## Tech Stack

- **Frontend:** React 19, Vite, React Router v7, Axios, Modern Vanilla CSS Design System
- **Backend:** Node.js, Express.js (ES Modules), Mongoose
- **Database:** MongoDB
- **Authentication:** bcryptjs, jsonwebtoken (JWT)
- **AI Service:** Google Gemini API (`@google/generative-ai`) with isolated service architecture
- **Transcription:** `youtube-transcript` for time-coded caption extraction

---

## Project Structure

```
learnloop/
├── client/                  # React Frontend (Vite)
│   ├── src/
│   │   ├── components/      # Navbar, ProtectedRoute
│   │   ├── context/         # AuthContext (JWT management)
│   │   ├── pages/           # Login, Register, Dashboard, LecturePage, NotFound
│   │   ├── services/        # Axios API client (/api)
│   │   ├── App.jsx          # App router and layout
│   │   ├── main.jsx         # Vite entry
│   │   └── index.css        # Complete CSS design system
│   ├── vite.config.js       # Config with /api proxy to :5000
│   └── package.json
│
├── server/                  # Express Backend
│   ├── config/              # MongoDB connection
│   ├── controllers/         # authController, lectureController, chunkController
│   ├── middleware/          # authMiddleware (JWT verification)
│   ├── models/              # User, Lecture, Chunk, QuizAttempt schemas
│   ├── routes/              # authRoutes, lectureRoutes, chunkRoutes
│   ├── services/            # aiService, chunkService, transcriptionService, youtubeService
│   ├── .env.example         # Environment variables template
│   ├── .env                 # Local configuration
│   ├── server.js            # Express application entry
│   └── package.json
│
└── README.md
```

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new account (`name`, `email`, `password`) | No |
| POST | `/api/auth/login` | Login with credentials (`email`, `password`) | No |
| GET | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer JWT) |

### Lectures (`/api/lectures`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/lectures` | Submit lecture video URL (`videoUrl`) & trigger processing | Yes |
| GET | `/api/lectures` | List user lectures with chunk counts and progress | Yes |
| GET | `/api/lectures/:id` | Get lecture details and chunk unlock statuses | Yes |
| DELETE | `/api/lectures/:id` | Delete lecture and associated chunks/attempts | Yes |

### Chunks & Quizzes (`/api/chunks`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/chunks/:chunkId` | Get chunk learning material (if unlocked) | Yes |
| GET | `/api/chunks/:chunkId/quiz` | Get quiz questions without answers (if unlocked) | Yes |
| POST | `/api/chunks/:chunkId/quiz/submit` | Submit answers, calculate score, evaluate $\ge 75\%$ unlock | Yes |

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (local running on `mongodb://localhost:27017` or MongoDB Atlas URI)
- Google Gemini API Key (optional for development; fallback generator is included)

### 2. Environment Setup
Configure `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/learnloop
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Backend Server
```bash
cd server
npm install
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 4. Start Frontend Client
```bash
cd client
npm install
npm run dev
```
The frontend runs on `http://localhost:5173` with automated proxying to the backend on `/api`.

### 5. Production Build
To verify production bundle build:
```bash
cd client
npm run build
```