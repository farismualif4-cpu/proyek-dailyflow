require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const taskRoutes = require("./routes/task.routes");
const noteRoutes = require("./routes/note.routes");
const habitRoutes = require("./routes/habit.routes");
const reminderRoutes = require("./routes/reminder.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "DailyFlow API is running!",
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);

// 404 Handler untuk rute yang tidak ditemukan
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Rute ${req.originalUrl} tidak ditemukan`,
    });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Terjadi kesalahan pada server",
    });
});

// Server
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`DailyFlow API berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;
