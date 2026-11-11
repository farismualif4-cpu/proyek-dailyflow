
const { z } = require("zod");

// Validasi saat membuat tugas
const createTaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Judul tugas wajib diisi")
        .max(150, "Judul maksimal 150 karakter"),

    description: z
        .string()
        .optional()
        .nullable(),

    priority: z
        .enum(["LOW", "MEDIUM", "HIGH"])
        .optional(),

    status: z
        .enum(["PENDING", "IN_PROGRESS", "COMPLETED"])
        .optional(),

    dueDate: z
        .string()
        .datetime({ offset: true })
        .optional()
        .nullable(),
});

// Validasi saat memperbarui tugas
const updateTaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Judul tugas wajib diisi")
        .max(150, "Judul maksimal 150 karakter")
        .optional(),

    description: z
        .string()
        .nullable()
        .optional(),

    priority: z
        .enum(["LOW", "MEDIUM", "HIGH"])
        .optional(),

    status: z
        .enum(["PENDING", "IN_PROGRESS", "COMPLETED"])
        .optional(),

    dueDate: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "Minimal satu data harus diperbarui" }
);

module.exports = {
    createTaskSchema,
    updateTaskSchema,
};
