const { z } = require("zod");

// Validasi request Smart Task Planner
const plannerSuggestSchema = z.object({
    goal: z
        .string({
            required_error: "Target atau sasaran perencanaan wajib diisi",
        })
        .trim()
        .min(3, "Target minimal 3 karakter")
        .max(2000, "Target maksimal 2000 karakter"),

    taskId: z
        .string()
        .trim()
        .optional()
        .nullable(),

    conversationId: z
        .string()
        .trim()
        .optional()
        .nullable(),
});

module.exports = {
    plannerSuggestSchema,
};
