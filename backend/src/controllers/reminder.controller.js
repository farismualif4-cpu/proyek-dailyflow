const prisma = require("../config/prisma");

const {
    createReminderSchema,
    updateReminderSchema,
} = require("../validators/reminder.validator");

// ==========================================
// 1. CREATE REMINDER (Membuat Pengingat)
// ==========================================
const createReminder = async (req, res) => {
    try {
        const validation = createReminderSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { title, message, remindAt, isSent, taskId } = validation.data;

        // Jika taskId disertakan, pastikan task tersebut milik pengguna yang sedang login
        if (taskId) {
            const existingTask = await prisma.task.findFirst({
                where: {
                    id: taskId,
                    userId: req.user.id,
                },
            });

            if (!existingTask) {
                return res.status(400).json({
                    success: false,
                    message: "Tugas terkait tidak ditemukan atau bukan milik Anda",
                });
            }
        }

        const reminder = await prisma.reminder.create({
            data: {
                title,
                message: message ?? null,
                remindAt: new Date(remindAt),
                isSent: isSent ?? false,
                taskId: taskId ?? null,
                userId: req.user.id,
            },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Pengingat berhasil dibuat",
            data: reminder,
        });
    } catch (error) {
        console.error("Create reminder error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 2. GET ALL REMINDERS (Menampilkan Semua Pengingat)
// ==========================================
const getReminders = async (req, res) => {
    try {
        const { isSent, taskId } = req.query;

        const where = {
            userId: req.user.id,
        };

        if (isSent !== undefined) {
            where.isSent = isSent === "true";
        }

        if (taskId) {
            where.taskId = taskId;
        }

        const reminders = await prisma.reminder.findMany({
            where,
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                    },
                },
            },
            orderBy: {
                remindAt: "asc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Daftar pengingat berhasil diambil",
            data: reminders,
        });
    } catch (error) {
        console.error("Get reminders error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 3. GET REMINDER BY ID (Detail Pengingat)
// ==========================================
const getReminderById = async (req, res) => {
    try {
        const reminder = await prisma.reminder.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                    },
                },
            },
        });

        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: "Pengingat tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            data: reminder,
        });
    } catch (error) {
        console.error("Get reminder by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 4. UPDATE REMINDER (Memperbarui Pengingat)
// ==========================================
const updateReminder = async (req, res) => {
    try {
        const validation = updateReminderSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        // Verifikasi kepemilikan pengingat
        const existingReminder = await prisma.reminder.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingReminder) {
            return res.status(404).json({
                success: false,
                message: "Pengingat tidak ditemukan",
            });
        }

        const data = { ...validation.data };

        // Konversi remindAt ke objek Date jika dikirimkan
        if (data.remindAt) {
            data.remindAt = new Date(data.remindAt);
        }

        // Jika taskId diubah dan bukan null, pastikan task milik user
        if (data.taskId) {
            const existingTask = await prisma.task.findFirst({
                where: {
                    id: data.taskId,
                    userId: req.user.id,
                },
            });

            if (!existingTask) {
                return res.status(400).json({
                    success: false,
                    message: "Tugas terkait tidak ditemukan atau bukan milik Anda",
                });
            }
        }

        const updatedReminder = await prisma.reminder.update({
            where: {
                id: existingReminder.id,
            },
            data,
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Pengingat berhasil diperbarui",
            data: updatedReminder,
        });
    } catch (error) {
        console.error("Update reminder error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 5. DELETE REMINDER (Menghapus Pengingat)
// ==========================================
const deleteReminder = async (req, res) => {
    try {
        const existingReminder = await prisma.reminder.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingReminder) {
            return res.status(404).json({
                success: false,
                message: "Pengingat tidak ditemukan",
            });
        }

        await prisma.reminder.delete({
            where: {
                id: existingReminder.id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Pengingat berhasil dihapus",
        });
    } catch (error) {
        console.error("Delete reminder error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

module.exports = {
    createReminder,
    getReminders,
    getReminderById,
    updateReminder,
    deleteReminder,
};

