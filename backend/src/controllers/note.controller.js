const prisma = require("../config/prisma");

const {
    createNoteSchema,
    updateNoteSchema,
} = require("../validators/note.validator");

// ==========================================
// 1. CREATE NOTE (Membuat Catatan)
// ==========================================
const createNote = async (req, res) => {
    try {
        const validation = createNoteSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { title, content, category } = validation.data;

        const note = await prisma.note.create({
            data: {
                title,
                content: content ?? "",
                category: category ?? null,
                userId: req.user.id,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Catatan berhasil dibuat",
            data: note,
        });
    } catch (error) {
        console.error("Create note error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 2. GET ALL NOTES (Menampilkan Semua Catatan)
// ==========================================
const getNotes = async (req, res) => {
    try {
        const { category, search } = req.query;

        // Memastikan hanya mengambil catatan milik pengguna yang sedang login
        const where = {
            userId: req.user.id,
        };

        if (category) {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
            ];
        }

        const notes = await prisma.note.findMany({
            where,
            orderBy: {
                updatedAt: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Daftar catatan berhasil diambil",
            data: notes,
        });
    } catch (error) {
        console.error("Get notes error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 3. GET NOTE BY ID (Menampilkan Detail Catatan)
// ==========================================
const getNoteById = async (req, res) => {
    try {
        // Hanya mencari catatan dengan ID yang sesuai dan dimiliki oleh pengguna login
        const note = await prisma.note.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Catatan tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            data: note,
        });
    } catch (error) {
        console.error("Get note error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 4. UPDATE NOTE (Mengedit Catatan)
// ==========================================
const updateNote = async (req, res) => {
    try {
        const validation = updateNoteSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        // Verifikasi kepemilikan catatan terlebih dahulu
        const existingNote = await prisma.note.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingNote) {
            return res.status(404).json({
                success: false,
                message: "Catatan tidak ditemukan",
            });
        }

        const updatedNote = await prisma.note.update({
            where: {
                id: existingNote.id,
            },
            data: validation.data,
        });

        return res.status(200).json({
            success: true,
            message: "Catatan berhasil diperbarui",
            data: updatedNote,
        });
    } catch (error) {
        console.error("Update note error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 5. DELETE NOTE (Menghapus Catatan)
// ==========================================
const deleteNote = async (req, res) => {
    try {
        // Verifikasi kepemilikan catatan sebelum menghapus
        const existingNote = await prisma.note.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingNote) {
            return res.status(404).json({
                success: false,
                message: "Catatan tidak ditemukan",
            });
        }

        await prisma.note.delete({
            where: {
                id: existingNote.id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Catatan berhasil dihapus",
        });
    } catch (error) {
        console.error("Delete note error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

module.exports = {
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
};

