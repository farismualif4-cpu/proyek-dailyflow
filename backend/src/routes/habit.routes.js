const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
    createHabit,
    getHabits,
    getHabitById,
    updateHabit,
    deleteHabit,
    checkInHabit,
    getHabitHistory,
    getHabitStatistics,
} = require("../controllers/habit.controller");

// Seluruh endpoint kebiasaan wajib menggunakan autentikasi
router.use(authMiddleware);

// POST /api/habits - Membuat kebiasaan baru
router.post("/", createHabit);

// GET /api/habits - Mengambil seluruh kebiasaan milik pengguna
router.get("/", getHabits);

// GET /api/habits/statistics - Mengambil statistik kebiasaan (Wajib sebelum /:id)
router.get("/statistics", getHabitStatistics);

// GET /api/habits/:id - Mengambil detail kebiasaan
router.get("/:id", getHabitById);

// PATCH /api/habits/:id - Memperbarui kebiasaan
router.patch("/:id", updateHabit);

// DELETE /api/habits/:id - Menghapus kebiasaan
router.delete("/:id", deleteHabit);

// POST /api/habits/:id/check-ins - Mencatat check-in kebiasaan
router.post("/:id/check-ins", checkInHabit);

// GET /api/habits/:id/history - Mengambil riwayat check-in kebiasaan
router.get("/:id/history", getHabitHistory);

module.exports = router;

