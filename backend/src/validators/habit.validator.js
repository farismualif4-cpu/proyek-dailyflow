const { z } = require("zod");

// Validasi saat membuat kebiasaan baru
const createHabitSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nama kebiasaan wajib diisi")
        .max(100, "Nama kebiasaan maksimal 100 karakter"),

    description: z
        .string()
        .trim()
        .max(500, "Deskripsi maksimal 500 karakter")
        .optional()
        .nullable(),
});

// Validasi saat memperbarui kebiasaan
const updateHabitSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Nama kebiasaan wajib diisi")
            .max(100, "Nama kebiasaan maksimal 100 karakter")
            .optional(),

        description: z
            .string()
            .trim()
            .max(500, "Deskripsi maksimal 500 karakter")
            .optional()
            .nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Minimal satu data harus diperbarui",
    });

// Validasi saat check-in kebiasaan
const checkInSchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
        .optional(),

    completed: z
        .boolean()
        .optional(),
});

// Validasi query parameter riwayat (history)
const historyQuerySchema = z.object({
    startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format startDate harus YYYY-MM-DD")
        .optional(),

    endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format endDate harus YYYY-MM-DD")
        .optional(),
});

module.exports = {
    createHabitSchema,
    updateHabitSchema,
    checkInSchema,
    historyQuerySchema,
};

