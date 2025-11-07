# Quick Start Guide

## 🚀 Running the Application

### One Command Start (Recommended)

```bash
make start
```

This will:
- ✅ Create `frontend/.env.local` if missing
- ✅ Generate JWT_SECRET if missing
- ✅ Start backend (Docker) on http://localhost:4002
- ✅ Start frontend (Next.js) on http://localhost:3000

Then open: **http://localhost:3000**

### Stop All Servers

```bash
make stop
```

---

## 📝 First Time Setup

1. **Clone & Install**
```bash
cd /home/dev/Projects/cc360/onboarding-widget
npm install
cd frontend && npm install && cd ..
```

2. **Configure GHL OAuth**

Edit `.env` and add your GHL credentials:
```env
GHL_CLIENT_ID=your_client_id_here
GHL_CLIENT_SECRET=your_client_secret_here
```

3. **Start Everything**
```bash
make start
```

---

## 🧪 Testing the Application

1. **Open Browser**: http://localhost:3000
2. **Register**: Click "Register" tab
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
3. **Auto-Login**: Redirects to dashboard
4. **Connect Agency**: Click "Connect Agency OAuth" button
5. **Complete OAuth**: Authorize with GHL
6. **View Locations**: See your agency's locations

---

## 📚 Available Commands

```bash
make help              # Show all commands
make start             # Start backend + frontend
make start-backend     # Start backend only
make start-frontend    # Start frontend only
make stop              # Stop all servers
make restart           # Restart backend
make logs              # View backend logs
make migrate           # Run database migrations
make migrate-reset     # Reset database
make build             # Rebuild Docker containers
```

---

## 🌐 URLs

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:4002
- **Old Demo Page**: http://localhost:4002 (still works)

---

## 🔧 Manual Setup (Alternative)

If `make start` doesn't work:

### Terminal 1 - Backend
```bash
make start-backend
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

---

## 📁 Project Structure

```
.
├── src/                    # Backend Express code
│   ├── auth.ts            # JWT authentication
│   ├── app.ts             # Main Express app
│   ├── oauth.ts           # GHL OAuth flow
│   └── db.ts              # Database functions
├── frontend/              # Next.js frontend
│   ├── app/
│   │   ├── login/         # Login page
│   │   └── dashboard/     # Dashboard pages
│   └── lib/
│       └── api.ts         # API client
├── prisma/                # Database schema
└── public/                # Old widget files
```

---

## ❓ Troubleshooting

**Port already in use:**
```bash
make stop
# Or manually:
lsof -ti:4002 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Frontend can't connect to backend:**
```bash
# Check frontend/.env.local exists with:
echo "NEXT_PUBLIC_API_BASE=http://localhost:4002" > frontend/.env.local
```

**Database error:**
```bash
make migrate-reset
```

**Frontend won't start:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🎯 What's Next?

After starting:
1. Register a user at http://localhost:3000
2. Connect your GHL agency via OAuth
3. View your locations in the dashboard
4. Check Settings page for account info

---

**Need help? Check SETUP.md for detailed documentation.**


