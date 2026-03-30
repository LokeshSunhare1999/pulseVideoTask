# VideoVault — Video Upload, Sensitivity Processing & Streaming App

A full-stack application for video upload, automated content sensitivity analysis, and HTTP range-based streaming with real-time progress tracking.

---

## Tech Stack

**Backend:** Node.js · Express.js · MongoDB + Mongoose · Socket.io · JWT · Multer · fluent-ffmpeg  
**Frontend:** React · Vite · Tailwind CSS v4 · Axios · Socket.io client · React Router v6

---

## Quick Start

### Prerequisites
- Node.js 18+ LTS
- MongoDB (local or Atlas)
- FFmpeg (optional — for metadata extraction & thumbnails)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # Edit MONGODB_URI and JWT_SECRET
node src/seed.js            # Create demo users
npm run dev                 # Starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # Starts on http://localhost:5173
```

---

## Demo Accounts

| Role   | Email              | Password  | Permissions                        |
|--------|--------------------|-----------|------------------------------------|
| Admin  | admin@demo.com     | admin123  | Full access + user management      |
| Editor | editor@demo.com    | editor123 | Upload, edit, manage own videos    |
| Viewer | viewer@demo.com    | viewer123 | Read-only access to own videos     |

---

## API Endpoints

### Auth
| Method | Endpoint                    | Description              | Auth     |
|--------|-----------------------------|--------------------------|----------|
| POST   | /api/auth/register          | Register new user        | Public   |
| POST   | /api/auth/login             | Login                    | Public   |
| GET    | /api/auth/me                | Get current user         | Required |
| GET    | /api/auth/users             | List all users           | Admin    |
| PATCH  | /api/auth/users/:id/role    | Update user role         | Admin    |

### Videos
| Method | Endpoint                    | Description              | Auth          |
|--------|-----------------------------|--------------------------|---------------|
| POST   | /api/videos/upload          | Upload video             | Editor/Admin  |
| GET    | /api/videos                 | List videos (filtered)   | Required      |
| GET    | /api/videos/:id             | Get video details        | Required      |
| PATCH  | /api/videos/:id             | Update video metadata    | Editor/Admin  |
| DELETE | /api/videos/:id             | Delete video             | Editor/Admin  |
| GET    | /api/videos/:id/stream      | Stream video (range req) | Required      |
| GET    | /api/videos/:id/thumbnail   | Get thumbnail            | Required      |
| POST   | /api/videos/:id/reprocess   | Reprocess failed video   | Admin         |

### Query Parameters for GET /api/videos
- `status` — uploading | uploaded | processing | completed | failed
- `classification` — safe | flagged | pending
- `category` — any category string
- `search` — full-text search on title, description, tags
- `page`, `limit` — pagination
- `sortBy`, `sortOrder` — sorting

---

## Architecture

```
video-app/
├── backend/
│   ├── src/
│   │   ├── models/         # Mongoose schemas (User, Video)
│   │   ├── routes/         # Express routers (auth, videos)
│   │   ├── middleware/      # JWT auth, Multer upload
│   │   ├── services/        # Video processing pipeline
│   │   ├── seed.js          # Demo data seeder
│   │   └── server.js        # Express + Socket.io entry point
│   ├── uploads/             # Video file storage (gitignored)
│   └── .env
└── frontend/
    └── src/
        ├── components/      # Navbar, VideoCard, ProtectedRoute
        ├── context/         # AuthContext, VideoContext
        ├── pages/           # Login, Register, Dashboard, Library, Upload, Watch, Admin
        └── services/        # Axios instance, Socket.io client
```

---

## Features

- **Video Upload** — drag-and-drop with real-time upload progress, file type/size validation
- **Processing Pipeline** — metadata extraction → thumbnail generation → sensitivity analysis → status updates
- **Real-Time Updates** — Socket.io broadcasts processing progress to all connected clients
- **Sensitivity Analysis** — automated safe/flagged classification with confidence score
- **HTTP Streaming** — range request support for efficient video playback and seeking
- **RBAC** — viewer / editor / admin roles with route-level enforcement
- **Multi-Tenant** — users are isolated by organization; admins see all
- **Filtering** — filter by status, classification, category, search query, with pagination

---

## Design Decisions

1. **Simulated sensitivity analysis** — uses a probabilistic model for demo. In production, integrate AWS Rekognition Video, Google Video Intelligence API, or Azure Content Moderator.
2. **Local file storage** — videos stored in `backend/uploads/`. For production, swap Multer's disk storage for an S3 stream upload.
3. **FFmpeg optional** — if FFmpeg is not installed, metadata extraction gracefully falls back to defaults; the rest of the pipeline continues normally.
4. **JWT in localStorage** — acceptable for this scope. For production, use httpOnly cookies.
5. **Socket.io global events** — progress events are broadcast globally (not per-room) for simplicity. The frontend filters by videoId.
