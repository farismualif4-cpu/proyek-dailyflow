const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
} = require("../controllers/note.controller");

// Semua endpoint catatan wajib menggunakan autentikasi
router.use(authMiddleware);

// POST /api/notes - Membuat catatan baru
router.post("/", createNote);

// GET /api/notes - Menampilkan semua catatan milik pengguna
router.get("/", getNotes);

// GET /api/notes/:id - Menampilkan detail catatan
router.get("/:id", getNoteById);

// PUT /api/notes/:id & PATCH /api/notes/:id - Mengedit catatan
router.put("/:id", updateNote);
router.patch("/:id", updateNote);

// DELETE /api/notes/:id - Menghapus catatan
router.delete("/:id", deleteNote);

module.exports = router;

