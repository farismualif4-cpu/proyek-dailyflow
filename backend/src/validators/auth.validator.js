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

module.exports = {
    registerSchema,
    loginSchema,
};