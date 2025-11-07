# How to Run the Application

## ✅ Quick Start (One Command)

```bash
make start
```

This starts **3 containers** in Docker:
1. **PostgreSQL** (database) - port 5432
2. **Backend** (Express API) - http://localhost:4002
3. **Frontend** (Next.js Dashboard) - http://localhost:3000

Then open: **http://localhost:3000**

---

## 🛑 Stop All Servers

```bash
make stop
```

---

## 📝 First Time Only

### 1. Add JWT Secret to .env

```bash
# Generate secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env file (copy the output above)
echo "JWT_SECRET=your_generated_secret_here" >> .env
```

### 2. Add GHL Credentials to .env

Edit `.env` and add:
```env
GHL_CLIENT_ID=your_client_id
GHL_CLIENT_SECRET=your_client_secret
```

---

## 🎯 Usage

1. **Start servers**: `make start`
2. **Open browser**: http://localhost:3000
3. **Register**: Create new account
4. **Dashboard**: Click "Connect Agency OAuth"
5. **OAuth**: Authorize with GHL
6. **View Locations**: See your agency's locations

---

## 📊 Check Status

```bash
# View all running containers
docker-compose ps

# View logs (all services)
make logs

# View backend logs only
docker-compose logs -f widget

# View frontend logs only
docker-compose logs -f frontend
```

---

## 🔧 Rebuild After Changes

```bash
# Rebuild all containers
docker-compose build --no-cache

# Then restart
make start
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:4002 |
| Old Demo Page | http://localhost:4002 |

---

## ⚡ What's Running

After `make start`, you'll have:

```
✓ PostgreSQL  (postgres:5432)
✓ Backend     (localhost:4002)
✓ Frontend    (localhost:3000)
```

All three services run in Docker containers with hot-reload enabled.

---

## 🔍 Troubleshooting

**"Port already in use":**
```bash
make stop
docker-compose down
```

**"Can't connect to database":**
```bash
docker-compose down
docker-compose up -d
```

**"Frontend won't start":**
```bash
docker-compose logs frontend
```

**"Need to reset database":**
```bash
make migrate-reset
```

---

**That's it! Just run `make start` and you're good to go!** 🚀


