# DASH Multiverse — Setup Guide

## Project Structure

```
dash-multiverse/
├── index.html          ← Vite HTML entry
├── main.jsx            ← React root
├── DASHApp.jsx         ← Full UI (all 4 verses + spacetime hub)
├── api.js              ← API hooks (wire up after backend is running)
├── vite.config.js      ← Vite config (proxies /api → backend)
├── package.json        ← Frontend deps
│
backend/
├── server.js           ← Express + MySQL REST API
├── server-package.json ← rename to package.json in backend folder
├── .env.example        ← copy to .env and fill in credentials
```

---

## 1. Frontend Setup

```bash
# In your project root folder:
npm install
npm run dev
# → opens http://localhost:5173
```

---

## 2. Backend Setup

```bash
# Create a backend/ folder, move server.js and server-package.json into it
mkdir backend
mv server.js backend/
mv server-package.json backend/package.json

cd backend
npm install
cp ../.env.example .env
# Edit .env with your MySQL credentials

node server.js
# → API running on http://localhost:3001
```

---

## 3. Connect Real Database

Once the backend is running, replace mock data with live DB hooks.

## 4. Verse → Module Map

| Verse | Character | Color | DB Module |
|-------|-----------|-------|-----------|
| Code Verse | Omar | 🔴 Crimson | Tasks, Task_Assignment |
| Command Verse | Sara | 🔵 Cyan | Departments, Employees |
| Art Verse | Lina | 🟣 Purple | Games, Sales |
| Debug Verse | Yousef | 🟢 Green | QA Tasks, Test metrics |

---

## 5. API Endpoints Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | All tasks with assignee names |
| POST | /api/tasks | Create task |
| DELETE | /api/tasks/:id | Delete task |
| PATCH | /api/tasks/:id | Update progress/status |
| GET | /api/employees | All employees with dept info |
| GET | /api/departments | All depts with manager + locations |
| POST | /api/departments | Create department |
| GET | /api/games | All games with genres + platforms |
| POST | /api/games | Create game |
| DELETE | /api/games/:id | Delete game |
| GET | /api/sales | All sales with game + customer name |
| POST | /api/sales | Create sale |
| GET | /api/customers | All customers |
| GET | /api/stages | Stages with task count + avg progress |

---

## Notes

- The app uses **mock data by default** — fully functional without a DB connection.
- Swap to real data verse-by-verse using the `api.js` hooks.
- The Vite proxy (`/api` → `localhost:3001`) means no CORS issues in dev.
- For production, deploy backend separately and update `vite.config.js` proxy target.
