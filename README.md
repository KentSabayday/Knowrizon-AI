# Knowrizon 🎓✨

**Your Personal AI Tutor — Learn Smarter**

Knowrizon is an AI-powered tutoring application built for academic research. It helps users learn through interactive chat with AI tutors, content summarization, quiz generation, and progress tracking — all powered by Nebius AI.

## 🚀 Features

- **AI Chat Tutor** — Ask questions and get intelligent explanations from the TutorAgent powered by Nebius AI
- **Content Upload** — Upload PDFs and videos for AI-powered summarization and key point extraction
- **Quiz Generation** — Test your knowledge with AI-generated multiple-choice quizzes
- **Progress Tracking** — Monitor your learning progress with visual dashboards
- **Friends & Communication** — Connect with other learners, chat, and join group learning sessions
- **Dark/Light Theme** — Comfortable learning in any lighting condition

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite, Tailwind CSS, ShadCN UI |
| Backend | Python Flask, SQLite |
| AI | Nebius AI API (Text, Vision, Embeddings) |
| Real-time | WebRTC (voice/video calls), WebSockets |

## 📁 Project Structure

```
knowrizon/
├── .kiro/
│   ├── prompts/           # AI agent prompt configurations
│   │   ├── TutorAgent.json
│   │   ├── QuizAgent.json
│   │   └── ContentAgent.json
│   ├── specs/             # Feature specifications (requirements, design, tasks)
│   │   ├── knowrizon-ai-tutor/
│   │   ├── nebius-ai-integration/
│   │   └── friends-communication/
│   └── steering/          # Architecture documentation
│       └── architecture.md
├── frontend/              # React + Vite application
│   └── src/
│       ├── components/    # UI components (auth, chat, quiz, etc.)
│       ├── context/       # React contexts (Auth, Theme)
│       └── lib/           # Utilities
├── backend/               # Flask application
│   ├── app/
│   │   ├── models/        # Data models
│   │   ├── routes/        # API endpoints
│   │   └── services/      # Business logic & AI agents
│   ├── config/            # Configuration files
│   └── tests/             # Property-based tests
├── public/                # Static assets
├── mix.py                 # Build runner
├── DEVLOG.md              # Development timeline & decisions
└── README.md
```

## 🏃 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Nebius AI API Key

### Installation

1. Clone the repository

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   # backend/.env
   NEBIUS_API_KEY=your_nebius_api_key_here
   ```

### Development

Run both frontend and backend servers concurrently:

```bash
python mix.py dev
```

This starts:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Build for Production

```bash
python mix.py build
```

## 🤖 AI Agents

Knowrizon uses three specialized AI agents, each with configurable prompts stored in `.kiro/prompts/`:

| Agent | Role | Model |
|-------|------|-------|
| **TutorAgent** | Answers questions, explains concepts, provides learning support | Nebius Text Model |
| **QuizAgent** | Generates multiple-choice quizzes with explanations | Nebius Text Model |
| **ContentAgent** | Extracts key points from PDFs and videos | Nebius Vision + Text Models |

## 📋 Development Process

This project was built using a spec-driven development workflow:

1. **Steering Documents** (`.kiro/steering/`) — Architecture principles and coding standards
2. **Specs** (`.kiro/specs/`) — Feature requirements, design documents, and implementation tasks
3. **Prompts** (`.kiro/prompts/`) — Reusable AI agent configurations
4. **Dev Log** (`DEVLOG.md`) — Timeline, decisions, and challenges

## 🔗 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/anonymous` | POST | Create anonymous session |
| `/api/chat/message` | POST | Send message to TutorAgent |
| `/api/chat/stream` | POST | Stream response from TutorAgent |
| `/api/content/upload` | POST | Upload PDF/video |
| `/api/content/list` | GET | List user's content |
| `/api/quiz/generate` | POST | Generate quiz |
| `/api/quiz/submit` | POST | Submit quiz answers |
| `/api/progress` | GET | Get user progress |
| `/api/health` | GET | Health check |

## 📄 License

MIT
