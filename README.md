# LearnLoop AI

LearnLoop AI is a MERN-based learning platform where users provide a lecture video link, the lecture is divided into learning chunks, AI generates learning material and quizzes, and users must achieve at least 75% in a chunk quiz to unlock the next chunk.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Language:** JavaScript (ES Modules)

## Project Structure

```
learnloop/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── services/
│       ├── context/
│       ├── hooks/
│       ├── utils/
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
├── server/          # Express backend
│   ├── config/      # Database connection
│   ├── controllers/ # Route handlers
│   ├── middleware/   # Custom middleware
│   ├── models/      # Mongoose schemas
│   ├── routes/      # API routes
│   ├── services/    # Business logic
│   ├── utils/       # Helper utilities
│   ├── uploads/     # File uploads
│   └── server.js    # Entry point
│
├── .gitignore
└── README.md
```

## Day 1 — Foundation

- [x] React frontend (Vite)
- [x] Express backend
- [x] MongoDB connection
- [x] Mongoose models (User, Lecture, Chunk, QuizAttempt)
- [x] Basic project architecture
- [x] Health-check endpoint (`GET /api/health`)
- [x] Basic placeholder UI

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)

### 1. Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configure Environment Variables

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set your MongoDB connection string:

```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/learnloop?retryWrites=true&w=majority
```

### 3. Start the Backend

```bash
cd server
npm run dev
```

Server runs on `http://localhost:5000`.

### 4. Start the Frontend

```bash
cd client
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 5. Verify

Visit `http://localhost:5000/api/health` — you should see:

```json
{
  "success": true,
  "message": "LearnLoop API is running"
}
```

## License

ISC