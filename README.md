# Backend Docker Setup

## Quick Start

```bash
cd backend
cp .env.docker .env
docker-compose up
```

This starts:
- **PostgreSQL** database on port 5432
- **Backend API** on port 5000
- **Debugger** on port 9229

## Configuration

Edit `.env` file and add your API keys:
```env
OPENAI_API_KEY=sk-your-key-here
```

Restart after changes:
```bash
docker-compose restart backend
```

## Common Commands

```bash
# Start
docker-compose up              # Foreground
docker-compose up -d           # Background

# Stop
docker-compose down            # Stop containers
docker-compose down -v         # Delete database too

# Logs
docker-compose logs -f backend

# Restart
docker-compose restart backend

# Database
docker-compose exec postgres psql -U postgres -d sonoflow

# Initialize database
docker-compose exec backend npm run init-db
```

## Debugging

The backend runs with `--inspect=9229` by default.

**Attach debugger:**
1. Start: `docker-compose up`
2. VS Code Debug panel (Cmd+Shift+D)
3. Select "Debug Backend (Attach)"
4. Click ▶️

## Structure

```
backend/
├── docker-compose.yml    # Docker orchestration
├── Dockerfile            # Backend container image
├── docker-entrypoint.sh  # Auto DB initialization
├── .env                  # Environment variables (create from .env.docker)
├── .env.docker           # Environment template
└── .dockerignore         # Files to exclude from image
```

## Ports

- `5000` - Backend API
- `5432` - PostgreSQL
- `9229` - Debugger

## Environment Variables

- `OPENAI_API_KEY` - Required for batch voice transcription
- `GOOGLE_APPLICATION_CREDENTIALS` - Optional for streaming voice
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Auto-configured in docker-compose

## Database

PostgreSQL data persists in Docker volume `postgres_data`.

**Fresh start:**
```bash
docker-compose down -v
docker-compose up
```

**Access database:**
```bash
docker-compose exec postgres psql -U postgres -d sonoflow
```

## Troubleshooting

**Port already in use:**
```bash
lsof -ti:5000 | xargs kill -9
docker-compose up
```

**Container keeps crashing:**
```bash
docker-compose logs backend
```

**Database not ready:**
```bash
docker-compose restart postgres
```

## See Also

- [../START_HERE.md](../START_HERE.md) - Quick start guide
- [../HYBRID_SETUP.md](../HYBRID_SETUP.md) - Detailed hybrid setup
- [../DEBUG_GUIDE.md](../DEBUG_GUIDE.md) - Debugging guide
