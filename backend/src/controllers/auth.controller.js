const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema,
} = require("../validators/auth.validator");

// Membuat JWT Token
const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET belum dikonfigurasi");
    }

    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// REGISTER
const register = async (req, res) => {
    try {
        const validation = registerSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { name, email, password } = validation.data;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email sudah terdaftar",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        const token = generateToken(user.id);

        return res.status(201).json({
            success: true,
            message: "Registrasi berhasil",
            user,
            token,
        });
    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// LOGIN
const login = async (req, res) => {
    try {
        const validation = loginSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { email, password } = validation.data;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah",
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah",
            });
        }

        const token = generateToken(user.id);

        return res.status(200).json({
            success: true,
            message: "Login berhasil",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
            },
            token,
        });
    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
    try {
        const validation = updateProfileSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { name } = validation.data;

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { name },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Profil berhasil diperbarui",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Update Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
    try {
        const validation = changePasswordSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { oldPassword, newPassword } = validation.data;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Pengguna tidak ditemukan",
            });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Password lama tidak sesuai",
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword },
        });

        return res.status(200).json({
            success: true,
            message: "Password berhasil diperbarui",
        });
    } catch (error) {
        console.error("Change Password Error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// GET ACCOUNT STATS
const getAccountStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const [totalTasks, completedTasks, totalHabits, totalNotes, totalReminders, user] = await Promise.all([
            prisma.task.count({ where: { userId } }),
            prisma.task.count({ where: { userId, status: "COMPLETED" } }),
            prisma.habit.count({ where: { userId } }),
            prisma.note.count({ where: { userId } }),
            prisma.reminder.count({ where: { userId } }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                user,
                stats: {
                    totalTasks,
                    completedTasks,
                    totalHabits,
                    totalNotes,
                    totalReminders,
                },
            },
        });
    } catch (error) {
        console.error("Get Account Stats Error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

module.exports = {
    register,
    login,
    updateProfile,
    changePassword,
    getAccountStats,
};
