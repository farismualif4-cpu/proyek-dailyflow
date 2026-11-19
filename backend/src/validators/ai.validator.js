const { z } = require("zod");

// Validasi request chat AI
const chatMessageSchema = z.object({
    message: z
        .string({
            required_error: "Pesan wajib diisi",
        })
        .trim()
        .min(1, "Pesan tidak boleh kosong")
        .max(3000, "Pesan maksimal 3000 karakter"),

    conversationId: z
        .string()
        .trim()
        .optional()
        .nullable(),
});

module.exports = {
    chatMessageSchema,
};
