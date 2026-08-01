# Bhajan Scheduler

Bhajan scheduling and planning tool for Sri Sathya Sai Seva Organisation, Gandhinagar.

## Features

- **Submit Form** — Devotees submit bhajan preferences for upcoming sessions
- **Plan View** — View the curated bhajan plan for each session
- **Admin Dashboard** — Manage submissions, sessions, deity rules, and users
- **Master Bhajan Bank** — Searchable database of 6000+ bhajans with deity, raga, tempo metadata
- **Singer Dictionary** — Track singer assignments and availability
- **Analytics** — Session history, activity logs, and usage statistics
- **Google Sign-In** — Optional OAuth-based admin authentication

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher

### Installation

```bash
# Clone the repo
git clone https://github.com/vedasoham/Bhajan_Schedular.git
cd Bhajan_Schedular

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# Edit .env with your actual credentials

# Start the app
npm start
```

### URLs (local)
| Page | URL |
|------|-----|
| Submit Form | http://localhost:8000/submit-form |
| Plan View | http://localhost:8000/plan-view |
| Admin Dashboard | http://localhost:8000/admin |

## Environment Variables

See [`.env.example`](.env.example) for all available variables. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPER_ADMIN_USER` | ✅ | Username for the initial super admin account |
| `SUPER_ADMIN_PASS` | ✅ | Password for the initial super admin account |
| `SESSION_SECRET` | ✅ | Random string for signing session cookies |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID for admin sign-in |
| `DB_PATH` | Optional | Path to SQLite database file (default: `./bhajans.db`) |
| `NODE_ENV` | Optional | Set to `production` on Railway |
| `PORT` | Optional | Server port (default: `8000`) |

## Deploying to Railway

1. Push this repo to GitHub
2. Create a new Railway project → Deploy from GitHub repo
3. Add a **Volume** in Railway, mount it at `/data`
4. Set these environment variables in Railway:
   - `SUPER_ADMIN_USER`, `SUPER_ADMIN_PASS`, `SUPER_ADMIN_DISPLAY_NAME`
   - `SESSION_SECRET` (use a long random string)
   - `DB_PATH=/data/bhajans.db`
   - `NODE_ENV=production`
   - `GOOGLE_CLIENT_ID` (if using Google sign-in)
5. Deploy — Railway will auto-detect `npm start` via `railway.json`

> **Important**: You must add a Railway Volume for data persistence. Without it, your database resets on every deploy.

## Tech Stack

- **Runtime**: Node.js + Express
- **Templating**: EJS with express-ejs-layouts
- **Database**: SQLite via Sequelize ORM
- **Auth**: bcrypt password hashing + Google OAuth
- **Security**: CSP headers, rate limiting, cross-site write blocking