const { z } = require("zod");

// Validasi data Register
const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Nama minimal 2 karakter"),

    email: z
        .string()
        .trim()
        .email("Format email tidak valid")
        .toLowerCase(),

    password: z
        .string()
        .min(8, "Password minimal 8 karakter"),
});

// Validasi data Login
const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Format email tidak valid")
        .toLowerCase(),

    password: z
        .string()
        .min(1, "Password wajib diisi"),
});

// Validasi Update Profil
const updateProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Nama minimal 2 karakter")
        .max(100, "Nama maksimal 100 karakter"),
});

// Validasi Ganti Password
const changePasswordSchema = z.object({
    oldPassword: z
        .string()
        .min(1, "Password saat ini wajib diisi"),
    newPassword: z
        .string()
        .min(8, "Password baru minimal 8 karakter"),
});

module.exports = {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema,
};