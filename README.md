# 🎬 Video Stream DML — Multi-Bitrate HLS Streaming Platform

A high-performance video streaming prototype built with **FastAPI**, **React**, and **FFmpeg**. Uploaded videos are transcoded into **Adaptive Bitrate HLS** (240p–1080p), enabling instant playback with zero buffering regardless of network conditions.


---

## 🏗️ Architecture Overview

```
┌──────────────┐     ┌──────────────────────────────────────────┐     ┌──────────────┐
│              │     │              FastAPI Backend              │     │              │
│    React     │────▶│                                          │────▶│ Cloudflare   │
│   Frontend   │     │  Upload ──▶ FFmpeg (5 renditions) ──▶ R2 │     │     R2       │
│   (Vite)     │◀────│                                          │     │  (S3-compat) │
│              │     │  PostgreSQL ◀──▶ SQLAlchemy (Async)      │     │              │
└──────────────┘     └──────────────────────────────────────────┘     └──────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │   PostgreSQL     │
                               │   (Docker)       │
                               └─────────────────┘
```

### How HLS Adaptive Bitrate Streaming Works

When a video is uploaded, the backend:

1. **Saves** the raw video file to a temp directory
2. **Transcodes** it into 5 quality levels using FFmpeg:

   | Quality | Resolution  | Video Bitrate | Audio Bitrate |
   |---------|-------------|---------------|---------------|
   | 240p    | 426×240     | 400 kbps      | 64 kbps       |
   | 360p    | 640×360     | 800 kbps      | 96 kbps       |
   | 480p    | 854×480     | 1400 kbps     | 128 kbps      |
   | 720p    | 1280×720    | 2800 kbps     | 128 kbps      |
   | 1080p   | 1920×1080   | 5000 kbps     | 192 kbps      |

3. **Generates** a `master.m3u8` playlist referencing all quality variants
4. **Uploads** all `.m3u8` playlists and `.ts` segments to Cloudflare R2
5. **Updates** the database with the `master.m3u8` URL

The frontend player (HLS.js) reads the master playlist, auto-detects the user's bandwidth, and **seamlessly switches** between quality levels — ensuring instant playback with zero buffering.

---

## 🛠️ Tech Stack

| Layer          | Technology                                |
|----------------|-------------------------------------------|
| Backend        | Python 3.11, FastAPI, Uvicorn             |
| ORM            | SQLAlchemy 2.0 (Async)                    |
| Migrations     | Alembic                                   |
| Validation     | Pydantic v2                               |
| Database       | PostgreSQL 16                             |
| Object Storage | Cloudflare R2 (S3-compatible via boto3)   |
| Transcoding    | FFmpeg (async subprocess)                 |
| Frontend       | React 18, Vite, TailwindCSS              |
| HLS Player     | hls.js                                    |
| Infrastructure | Docker, Docker Compose                    |
| CI/CD          | GitHub Actions                            |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) & Docker Compose
- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) bucket with API credentials

### 1. Clone & Configure

```bash
git clone https://github.com/your-username/video-stream-dml.git
cd video-stream-dml
```

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/video_stream_db
R2_ENDPOINT_URL=https://<your-account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET_NAME=<your-bucket-name>
APP_NAME=Video Stream DML
DEBUG=true
```

> ⚠️ **Important**: Use `db` (not `localhost`) as the PostgreSQL host when running with Docker Compose. The `db` hostname resolves to the PostgreSQL container via Docker's internal DNS.

### 2. Launch with Docker Compose

```bash
docker-compose up --build
```

This starts 3 containers:
- **PostgreSQL** — `localhost:5432`
- **FastAPI Backend** — `localhost:8000`
- **React Frontend** — `localhost:3000`

### 3. Run Database Migrations

In a separate terminal:

```bash
docker exec -it video_stream_backend alembic revision --autogenerate -m "initial"
docker exec -it video_stream_backend alembic upgrade head
```

### 4. Open the App

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📡 API Endpoints

| Method   | Endpoint                    | Status | Description                          |
|----------|-----------------------------|--------|--------------------------------------|
| `POST`   | `/api/v1/videos/upload`     | 201    | Upload video + start HLS transcoding |
| `GET`    | `/api/v1/videos/`           | 200    | List all videos                      |
| `GET`    | `/api/v1/videos/{id}`       | 200    | Get video by ID                      |
| `PATCH`  | `/api/v1/videos/{id}`       | 200    | Rename a video                       |
| `DELETE` | `/api/v1/videos/{id}`       | 204    | Delete video + R2 assets             |
| `GET`    | `/health`                   | 200    | Health check                         |

---

## 📁 Project Structure

```
├── .github/workflows/main.yml    # CI/CD pipeline
├── backend/
│   ├── app/
│   │   ├── api/v1/videos.py      # REST endpoints
│   │   ├── config.py             # Pydantic Settings
│   │   ├── dependencies.py       # FastAPI DI container
│   │   ├── db/                   # Async SQLAlchemy engine
│   │   ├── models/video.py       # ORM model
│   │   ├── schemas/video.py      # Pydantic schemas
│   │   ├── services/
│   │   │   ├── video_service.py         # Business logic
│   │   │   ├── transcoding_service.py   # FFmpeg ABR pipeline
│   │   │   └── storage_service.py       # Cloudflare R2 client
│   │   └── utils/logger.py       # Centralized logging
│   ├── alembic/                  # DB migrations
│   ├── tests/                    # Pytest suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── services/api.js       # Axios API client
│   │   └── App.jsx               # Main app
│   ├── nginx.conf                # Production nginx config
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🏛️ Design Decisions

| Principle | Implementation |
|-----------|----------------|
| **Single Responsibility** | Models own DB schema. Schemas own validation. Services own business logic. Routers own HTTP. |
| **Dependency Inversion** | Routers depend on `VideoService` (abstraction), not on SQLAlchemy or boto3 directly. |
| **Dependency Injection** | FastAPI's `Depends()` wires DB sessions and services into route handlers automatically. |
| **Interface Segregation** | Separate Pydantic schemas per operation: `VideoCreate`, `VideoRename`, `VideoResponse`. |
| **Open/Closed** | Adding a new rendition (e.g., 4K) requires only adding an entry to the `RENDITIONS` config — no service code changes. |

---

## 🔮 Future Scalability

### Database: PostgreSQL → Azure Cosmos DB (NoSQL)
For global, millisecond-latency distribution, the PostgreSQL database could be swapped for **Azure Cosmos DB** with the NoSQL API. Cosmos DB provides:
- **Single-digit millisecond reads** at any scale worldwide
- **Multi-region writes** with automatic conflict resolution
- **99.999% SLA** for availability
- The video metadata (ID, title, status, HLS URL) maps cleanly to a document model

The migration path: Replace SQLAlchemy with the `azure-cosmos` SDK, convert the `Video` model to a document schema, and update the service layer. The router and schema layers remain unchanged (SOLID architecture enables this).

### Caching: Redis for Presigned URLs
For production deployments with private R2 buckets, add **Redis** to cache presigned URLs:
- **Without cache**: Each segment request generates a presigned URL via S3 API (~200ms round trip)
- **With cache**: Redis lookup returns cached URL in <5ms (~95% latency reduction)
- Cache TTL set to slightly less than URL expiry (e.g., 55 min for 60 min URLs)

### Processing: Background Workers
Replace FastAPI's `BackgroundTasks` with **Celery + Redis** for production-scale transcoding:
- Dedicated worker processes for FFmpeg (CPU-intensive work off the API server)
- Job queuing, retries, and dead letter handling
- Horizontal scaling — add more workers as upload volume grows

### Delivery: CDN Edge Caching
Add **Cloudflare CDN** in front of R2 to cache `.ts` segments at 300+ global edge locations:
- Users download segments from the nearest edge server (<5ms latency)
- Origin (R2) is only hit on cache misses
- Automatic cache invalidation on video deletion

---

## 🧪 Running Tests

```bash
# Inside the backend container
docker exec -it video_stream_backend python -m pytest tests/ -v

# Or locally (with virtualenv)
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

---

## 📄 License

MIT
