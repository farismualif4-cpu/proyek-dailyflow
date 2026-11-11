const prisma = require("../config/prisma");

const {
    createTaskSchema,
    updateTaskSchema,
} = require("../validators/task.validator");

// ==========================================
// CREATE TASK
// ==========================================
const createTask = async (req, res) => {
    try {
        const validation = createTaskSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { title, description, priority, status, dueDate } =
            validation.data;

        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority,
                status,
                dueDate: dueDate ? new Date(dueDate) : null,
                userId: req.user.id,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Tugas berhasil dibuat",
            data: task,
        });
    } catch (error) {
        console.error("Create task error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// GET ALL TASKS
// ==========================================
const getTasks = async (req, res) => {
    try {
        const { status, priority, search } = req.query;

        const where = {
            userId: req.user.id,
        };

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Daftar tugas berhasil diambil",
            data: tasks,
        });
    } catch (error) {
        console.error("Get tasks error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// GET TASK BY ID
// ==========================================
const getTaskById = async (req, res) => {
    try {
        const task = await prisma.task.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Tugas tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            data: task,
        });
    } catch (error) {
        console.error("Get task error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// UPDATE TASK
// ==========================================
const updateTask = async (req, res) => {
    try {
        const validation = updateTaskSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const existingTask = await prisma.task.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                message: "Tugas tidak ditemukan",
            });
        }

        const data = { ...validation.data };

        if (Object.prototype.hasOwnProperty.call(data, "dueDate")) {
            data.dueDate = data.dueDate
                ? new Date(data.dueDate)
                : null;
        }

        const updatedTask = await prisma.task.update({
            where: {
                id: existingTask.id,
            },
            data,
        });

        return res.status(200).json({
            success: true,
            message: "Tugas berhasil diperbarui",
            data: updatedTask,
        });
    } catch (error) {
        console.error("Update task error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// DELETE TASK
// ==========================================
const deleteTask = async (req, res) => {
    try {
        const existingTask = await prisma.task.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                message: "Tugas tidak ditemukan",
            });
        }

        await prisma.task.delete({
            where: {
                id: existingTask.id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Tugas berhasil dihapus",
        });
    } catch (error) {
        console.error("Delete task error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================
module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
};
