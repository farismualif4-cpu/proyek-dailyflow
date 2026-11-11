const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
    createReminder,
    getReminders,
    getReminderById,
    updateReminder,
    deleteReminder,
} = require("../controllers/reminder.controller");

// Semua endpoint pengingat wajib menggunakan autentikasi
router.use(authMiddleware);

// POST /api/reminders - Membuat pengingat baru
router.post("/", createReminder);

// GET /api/reminders - Mengambil seluruh pengingat milik pengguna
router.get("/", getReminders);

// GET /api/reminders/:id - Mengambil detail pengingat
router.get("/:id", getReminderById);

// PATCH /api/reminders/:id - Memperbarui pengingat
router.patch("/:id", updateReminder);

// DELETE /api/reminders/:id - Menghapus pengingat
router.delete("/:id", deleteReminder);

module.exports = router;

