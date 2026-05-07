# HabitFlow — PERN Stack Habit Tracker

PostgreSQL + Express + React + Node.js.  
No ORM. Raw SQL only. Pure JavaScript.

---

## Structure

```
server/                         # Node.js + Express backend
├── src/
│   ├── config/
│   │   ├── db.js               # pg Pool connection
│   │   └── migrate.js          # Creates all tables (run once)
│   ├── middleware/
│   │   └── auth.js             # JWT authentication
│   ├── routes/
│   │   ├── auth.js             # POST /register, /login, GET /me
│   │   ├── habits.js           # CRUD  /habits
│   │   ├── logs.js             # GET/POST /logs
│   │   ├── analytics.js        # GET /analytics/*
│   │   └── users.js            # GET /users/export
│   ├── app.js                  # Express app setup
│   └── index.js                # Entry point
├── .env.example
└── package.json

src/                            # React frontend
├── App.jsx
├── main.jsx
└── index.css
```

---

## Local Setup (step by step)

### 1  Install PostgreSQL

**Mac:**
```
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu:**
```
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**  
Download installer from https://www.postgresql.org/download/windows and run it.

### 2  Create database

```
psql -U postgres
```
```sql
CREATE DATABASE habitflow;
\q
```

### 3  Clone and install

```
git clone <repo-url>
cd habitflow

cd server
npm install

cd ..
npm install
```

### 4  Configure environment

```
cd server
cp .env.example .env
```

Edit `server/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_pg_password
DB_NAME=habitflow

JWT_SECRET=pick-any-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 5  Create tables

```
cd server
npm run db:init
```

You should see:
```
✅ Database tables created successfully
```

### 6  Start backend

```
cd server
npm run dev
```

You should see:
```
✅ PostgreSQL connected
🚀 Server running on http://localhost:5000
📡 API at http://localhost:5000/api
```

### 7  Start frontend (new terminal)

```
cd ..
npm run dev
```

### 8  Open app

Go to **http://localhost:5173** and register an account.

---

## SQL Schema (created by migrate.js)

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username    VARCHAR(50) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  points      INTEGER DEFAULT 0,
  level       INTEGER DEFAULT 1,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE habits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  category    VARCHAR(30) DEFAULT 'OTHER',
  frequency   VARCHAR(20) DEFAULT 'DAILY',
  color       VARCHAR(7) DEFAULT '#3b82f6',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id    UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      VARCHAR(10) CHECK (status IN ('COMPLETED','MISSED')),
  reason      VARCHAR(500),
  notes       VARCHAR(1000),
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  VARCHAR(50) NOT NULL,
  unlocked_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
```

---

## API Endpoints

### Auth
```
POST /api/auth/register   { username, email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me         (token required)
```

### Habits
```
GET    /api/habits         — all user habits
GET    /api/habits/:id     — single habit
POST   /api/habits         { title, description?, category?, frequency?, color? }
PUT    /api/habits/:id     { title?, description?, category?, frequency?, color? }
DELETE /api/habits/:id
```

### Logs
```
GET  /api/logs              — all logs
GET  /api/logs/date/:date   — logs for a date (YYYY-MM-DD)
GET  /api/logs/habit/:id    — logs for a habit
POST /api/logs              { habitId, date, status, reason?, notes? }
```

### Analytics
```
GET /api/analytics/daily?days=30
GET /api/analytics/monthly
GET /api/analytics/streaks
GET /api/analytics/overview
```

### Export
```
GET /api/users/export?format=json
GET /api/users/export?format=csv
```

---

## Deploy to Production

### Option A — Railway (backend + database) + Vercel (frontend)

**Backend:**
```
cd server
npm i -g @railway/cli
railway login
railway init
```
- In Railway dashboard → New → Database → PostgreSQL
- Set env vars:
  ```
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME   ← from Railway PostgreSQL
  JWT_SECRET=your-production-secret
  NODE_ENV=production
  CLIENT_URL=https://your-app.vercel.app
  ```
- Deploy: `railway up`
- Create tables: `railway run npm run db:init`

**Frontend:**
```
npm i -g vercel
vercel            # from project root, not server
```
- Set env var in Vercel dashboard:
  ```
  VITE_API_URL=https://your-railway-url.up.railway.app/api
  ```

### Option B — Render (backend) + Neon (database) + Vercel (frontend)

1. **Neon** — https://neon.tech — create free PostgreSQL, copy host/user/pass/dbname
2. **Render** — https://render.com — create Web Service
   - Root Directory: `server`
   - Build: `npm install`
   - Start: `npm start`
   - Env vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT=5432, JWT_SECRET, CLIENT_URL
3. Run tables: locally `DB_HOST=... npm run db:init` with Neon credentials
4. **Vercel** — same as above

### Option C — VPS (Ubuntu)

```bash
# Install Node + PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs postgresql postgresql-contrib

# Setup database
sudo -u postgres psql -c "CREATE DATABASE habitflow;"

# Clone and setup
git clone <repo> && cd habitflow/server
npm install
cp .env.example .env   # edit with real values
npm run db:init
npm install -g pm2
pm2 start src/index.js --name api
pm2 save && pm2 startup
```

### Option D — Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: habitflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  api:
    build: ./server
    depends_on: [db]
    ports: ["5000:5000"]
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_NAME: habitflow
      JWT_SECRET: changeme
      CLIENT_URL: http://localhost:5173
volumes:
  pgdata:
```

```dockerfile
# server/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "src/index.js"]
```

```bash
docker-compose up -d
docker-compose exec api npm run db:init
```

---

## Test the API

```bash
# Health
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@test.com","password":"demo123"}'

# Login → copy the token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo123"}'

# Create habit
curl -X POST http://localhost:5000/api/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Exercise","category":"FITNESS"}'

# Log a completion
curl -X POST http://localhost:5000/api/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"habitId":"HABIT_UUID","date":"2025-01-15","status":"completed"}'
```
