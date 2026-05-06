# AI Reel Factory

Generate vertical short-form videos end-to-end from a single topic prompt: AI script, AI images, AI voiceover, and a stitched MP4.

> Side project. Pipeline is intentionally minimal: still images + narration + cuts.

## Stack

- **Backend** — FastAPI, SQLAlchemy 2.x, Postgres
- **Frontend** — Next.js 16, React 19, Tailwind v4
- **AI** — Gemini 2.5 Flash (script), FLUX.1-schnell via HuggingFace (images), edge-tts (voice), MoviePy (video)

## Project layout

```
apps/                FastAPI backend
  main.py            HTTP routes
  ai_logic.py        Gemini, FLUX, TTS, video assembly
  config.py          Pydantic settings (env-driven)
  database.py        SQLAlchemy engine and session
  models.py          ORM models
  schemas.py         Pydantic request/response schemas
  logger.py          Structured logging setup
frontend/            Next.js app
  app/page.tsx       Single-page editor
  app/api.ts         Typed backend client
  app/types.ts       Shared types
static/              Generated media (gitignored)
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Postgres database (Supabase / Neon free tiers work)
- API keys for Google AI Studio (Gemini) and HuggingFace

### 1. Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in DATABASE_URL, GEMINI_API_KEY, HF_TOKEN
```

Initialize the database (creates the `reels` table from the ORM model):

```bash
python -c "from apps.database import Base, engine; from apps import models; Base.metadata.create_all(engine)"
```

Run the API:

```bash
uvicorn apps.main:app --reload --port 8000
```

Health check: <http://127.0.0.1:8000/health>
Interactive docs: <http://127.0.0.1:8000/docs>

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>.

## How it works

1. Enter a topic. The backend asks Gemini for a structured `ReelScript` (5-7 scenes, each with an `image_prompt` and `narration`).
2. Click on the reel card. For each scene, generate an image (FLUX) and a voiceover (edge-tts).
3. Click **Build Final Video**. MoviePy stitches each image + audio pair into a vertical MP4.

## API

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/health` | – | Liveness check |
| `POST` | `/generate-reel` | `{ topic }` | Generate script and persist a reel |
| `GET` | `/reels` | – | List all reels |
| `GET` | `/reels/{id}` | – | Fetch one reel |
| `POST` | `/generate-image` | `{ reel_id, scene_index, prompt }` | Generate one scene image |
| `POST` | `/generate-audio` | `{ reel_id, scene_index, text }` | Generate one scene voiceover |
| `POST` | `/update-assets/{id}` | `[SceneAsset]` | Persist asset URLs for a reel |
| `POST` | `/assemble-video/{id}` | `[SceneAsset]` | Render the final MP4 |

## Notes

- Free-tier HuggingFace inference can queue for minutes when busy.
- MoviePy rendering is CPU-bound and synchronous — one render at a time per worker.
- All generated media lives under `static/` and is served at `/static/...`.
