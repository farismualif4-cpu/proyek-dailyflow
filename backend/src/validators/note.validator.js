const { z } = require("zod");

// Validasi saat membuat catatan baru
const createNoteSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Judul catatan wajib diisi")
        .max(200, "Judul maksimal 200 karakter"),

    content: z
        .string()
        .optional()
        .nullable(),

    category: z
        .string()
        .trim()
        .max(50, "Kategori maksimal 50 karakter")
        .optional()
        .nullable(),
});

// Validasi saat memperbarui catatan
const updateNoteSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Judul catatan wajib diisi")
        .max(200, "Judul maksimal 200 karakter")
        .optional(),

    content: z
        .string()
        .optional()
        .nullable(),

    category: z
        .string()
        .trim()
        .max(50, "Kategori maksimal 50 karakter")
        .optional()
        .nullable(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "Minimal satu data harus diperbarui" }
);

module.exports = {
    createNoteSchema,
    updateNoteSchema,
};

