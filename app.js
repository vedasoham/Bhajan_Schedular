// ============================================================
// BHAJAN SCHEDULER - Node.js + Express + SQLite
// Sri Sathya Sai Seva Organisation - Gandhinagar
// ============================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const {initializeDatabase} = require("./services/databaseInitializer");

// ============================================================
// EXPRESS APP SETUP
// ============================================================

const app = express();
const PORT = process.env.PORT || 8000;

// Configure EJS Templating Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Core Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static Files
app.use(express.static("public"));

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || "sai_ram_gandhinagar_secret_key",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
}));

// ============================================================
// ROUTES
// ============================================================

const homeRoutes = require("./routes/home");
const plannerRoutes = require("./routes/planner");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const masterBankRoutes = require("./routes/masterBank");
const analyticsRoutes = require("./routes/analytics");
const singerRoutes = require("./routes/singer");

app.use("/", homeRoutes);
app.use("/", plannerRoutes);
app.use("/", apiRoutes);
app.use("/", authRoutes);
app.use("/", adminRoutes);
app.use("/", masterBankRoutes);
app.use("/", analyticsRoutes);
app.use("/", singerRoutes);
// ============================================================
// START SERVER
// ============================================================
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(
        `🕉️ Sai Ram! Bhajan Scheduler is running on http://localhost:${PORT}`,
      );

      console.log(`📋 Submit Form: http://localhost:${PORT}/submit-form`);

      console.log(`📊 Plan View: http://localhost:${PORT}/plan-view`);

      console.log(`🛠️ Admin Dashboard: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);

    process.exit(1);
  }
}

startServer();