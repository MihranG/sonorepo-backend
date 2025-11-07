# Port Configuration Guide

## Understanding Docker Port Mapping

Docker port mapping format: `"HOST_PORT:CONTAINER_PORT"`

- **HOST_PORT**: Port on your machine (Mac)
- **CONTAINER_PORT**: Port inside the Docker container

## Current Configuration

### PostgreSQL
```yaml
ports:
  - "5435:5432"  # Your Mac:Container
```

- **Inside container**: PostgreSQL runs on port `5432` (default)
- **On your Mac**: Accessible via `localhost:5435`
- **Between containers**: Backend connects to `postgres:5432`

### Backend API
```yaml
ports:
  - "5000:5000"  # Your Mac:Container
```

- **Inside container**: API runs on port `5000`
- **On your Mac**: Accessible via `localhost:5000`

### Debugger (Port 9229)
```yaml
ports:
  - "9235:9229"  # Your Mac:Container
```

- **Inside container**: Node.js debugger listens on port `9229`
- **On your Mac**: VS Code connects to `localhost:9235`
- **What it's for**: Node.js Inspector Protocol for debugging with VS Code

## Important: Environment Variables

When containers talk to each other via Docker network, they use **internal container ports**:

```yaml
environment:
  DB_HOST: postgres      # Docker service name
  DB_PORT: 5432         # INTERNAL port (not 5435!)
```

❌ **Wrong**: `DB_PORT: 5435` (backend can't connect)
✅ **Correct**: `DB_PORT: 5432` (backend connects successfully)

## Why Port 9229?

Port **9229** is the standard Node.js debugger port used with the `--inspect` flag:

```bash
node --inspect=9229 server.js
```

This allows VS Code (or any debugger) to:
- Set breakpoints
- Inspect variables
- Step through code
- View call stack

## VS Code Debug Configuration

Your `.vscode/launch.json` uses the **host port**:

```json
{
  "port": 9235  // Connect to localhost:9235 which maps to container's 9229
}
```

## Port Summary

| Service    | Host Port | Container Port | Purpose                    |
|------------|-----------|----------------|----------------------------|
| PostgreSQL | 5435      | 5432           | Database                   |
| Backend    | 5000      | 5000           | API Server                 |
| Debugger   | 9235      | 9229           | Node.js Inspector/Debugger |

## Common Mistakes

### ❌ Mistake 1: Changing Container Port
```yaml
ports:
  - "5435:5435"  # Wrong! Container expects 5432
```

Container can't start because PostgreSQL expects port 5432 internally.

### ❌ Mistake 2: Wrong DB_PORT in Environment
```yaml
environment:
  DB_PORT: 5435  # Wrong! This is the host port
```

Backend tries to connect to `postgres:5435` which doesn't exist. Should be `5432`.

### ✅ Correct Configuration
```yaml
ports:
  - "5435:5432"  # Host:Container

environment:
  DB_PORT: 5432  # Internal container port
```

## When to Change Ports

### Change Host Port (Left Side) When:
- Port is already in use on your Mac
- You want to run multiple instances
- You have conflicts with other applications

### Never Change Container Port (Right Side) Unless:
- You're building a custom Dockerfile that changes the default
- You really know what you're doing

## Testing Connections

### From Your Mac (Host)
```bash
# PostgreSQL
psql -h localhost -p 5435 -U postgres -d sonoflow

# Backend API
curl http://localhost:5000/api/health

# Debugger (VS Code will connect automatically)
# Just use the "Debug Backend (Attach)" configuration
```

### Inside Docker Network
```bash
# Backend connecting to PostgreSQL
# Uses internal network: postgres:5432
docker-compose exec backend node -e "console.log(process.env.DB_HOST, process.env.DB_PORT)"
# Output: postgres 5432
```

## Debugging Connection Issues

### Backend Can't Connect to Database?

1. **Check environment variables**:
   ```bash
   docker-compose exec backend env | grep DB_
   ```
   Should show `DB_PORT=5432` (not 5435)

2. **Check if PostgreSQL is ready**:
   ```bash
   docker-compose exec postgres pg_isready -U postgres
   ```

3. **Test connection from backend container**:
   ```bash
   docker-compose exec backend node -e "
   const { Pool } = require('pg');
   const pool = new Pool({
     host: 'postgres',
     port: 5432,
     user: 'postgres',
     password: 'postgres',
     database: 'sonoflow'
   });
   pool.query('SELECT NOW()').then(r => console.log('Connected:', r.rows[0]));
   "
   ```

### Debugger Won't Attach?

1. **Check backend is running with debugger**:
   ```bash
   docker-compose logs backend | grep "Debugger listening"
   ```
   Should show: `Debugger listening on ws://127.0.0.1:9229/...`

2. **Check VS Code is using correct port**:
   - Open `.vscode/launch.json`
   - Verify: `"port": 9235`

3. **Check port is exposed**:
   ```bash
   docker-compose ps
   ```
   Should show: `0.0.0.0:9235->9229/tcp`

## Summary

- **Host ports** (`5435`, `9235`): Connect from your Mac
- **Container ports** (`5432`, `5000`, `9229`): Used inside Docker
- **Environment variables**: Always use container ports
- **Port 9229**: Node.js debugger (Inspector Protocol)
- **Port mapping**: `"HOST:CONTAINER"` format

---

**Current Setup Working:**
✅ PostgreSQL: localhost:5435 → container:5432
✅ Backend API: localhost:5000 → container:5000
✅ Debugger: localhost:9235 → container:9229
✅ Backend → PostgreSQL: postgres:5432 (internal)
