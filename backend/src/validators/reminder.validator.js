const { z } = require("zod");

// Validasi saat membuat pengingat baru
const createReminderSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Judul pengingat wajib diisi")
        .max(150, "Judul maksimal 150 karakter"),

    message: z
        .string()
        .trim()
        .max(500, "Pesan maksimal 500 karakter")
        .optional()
        .nullable(),

    remindAt: z
        .string()
        .datetime({ offset: true })
        .or(z.string().datetime({ message: "Format remindAt harus ISO 8601 DateTime yang valid" })),

    isSent: z
        .boolean()
        .optional(),

    taskId: z
        .string()
        .trim()
        .optional()
        .nullable(),
});

// Validasi saat memperbarui pengingat
const updateReminderSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Judul pengingat wajib diisi")
            .max(150, "Judul maksimal 150 karakter")
            .optional(),

        message: z
            .string()
            .trim()
            .max(500, "Pesan maksimal 500 karakter")
            .optional()
            .nullable(),

        remindAt: z
            .string()
            .datetime({ offset: true })
            .or(z.string().datetime({ message: "Format remindAt harus ISO 8601 DateTime yang valid" }))
            .optional(),

        isSent: z
            .boolean()
            .optional(),

        taskId: z
            .string()
            .trim()
            .optional()
            .nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Minimal satu data harus diperbarui",
    });

module.exports = {
    createReminderSchema,
    updateReminderSchema,
};

