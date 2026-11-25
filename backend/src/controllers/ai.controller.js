const prisma = require("../config/prisma");
const { chatMessageSchema } = require("../validators/ai.validator");
const { plannerSuggestSchema } = require("../validators/aiPlanner.validator");
const { checkAndConsumeQuota, getQuotaStatus } = require("../services/aiQuota.service");
const { getUserContext } = require("../services/aiContext.service");
const openaiService = require("../services/openai.service");
const aiPlannerService = require("../services/aiPlanner.service");
const aiActionEngineService = require("../services/aiActionEngine.service");

// ==========================================
// CHAT WITH AI
// ==========================================
const chatWithAi = async (req, res) => {
    try {
        // 1. Validasi input request
        const validation = chatMessageSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { message, conversationId } = validation.data;
        const userId = req.user.id;

        // 2. Periksa dan konsumsi kuota harian (atomic & concurrency-safe)
        let quota;
        try {
            quota = await checkAndConsumeQuota(userId);
        } catch (quotaError) {
            if (quotaError.status === 429) {
                return res.status(429).json({
                    success: false,
                    message: quotaError.message,
                    code: quotaError.code || "AI_QUOTA_EXCEEDED",
                    quota: quotaError.quota,
                });
            }
            throw quotaError;
        }

        // 3. Cari atau buat percakapan baru (terisolasi per req.user.id)
        let conversation;
        if (conversationId) {
            conversation = await prisma.aiConversation.findFirst({
                where: {
                    id: conversationId,
                    userId,
                },
                include: {
                    messages: {
                        orderBy: { createdAt: "asc" },
                        take: 20, // Ambil maksimal 20 riwayat pesan terakhir
                    },
                },
            });

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: "Percakapan tidak ditemukan atau bukan milik Anda",
                });
            }
        } else {
            const rawTitle = message.trim();
            const title = rawTitle.slice(0, 45) + (rawTitle.length > 45 ? "..." : "");

            conversation = await prisma.aiConversation.create({
                data: {
                    title,
                    userId,
                },
                include: {
                    messages: true,
                },
            });
        }

        // 4. Ambil konteks data produktivitas pengguna (multi-tenant strictly scoped)
        const userContext = await getUserContext(userId);

        const systemPrompt = `Anda adalah asisten AI cerdas untuk aplikasi DailyFlow (Task, Note, Habit, Reminder manager).
Tugas Anda adalah membantu pengguna mengelola produktivitas mereka secara ramah, terstruktur, dan efektif.
Gunakan data konteks pengguna di bawah ini untuk menjawab pertanyaan dan memberikan rekomendasi yang personal dan relevan.
Jawab dengan bahasa Indonesia yang jelas, sopan, dan to-the-point. Format jawaban menggunakan markdown jika diperlukan.

${userContext}`;

        // 5. Simpan pesan pengguna ke database
        await prisma.aiMessage.create({
            data: {
                conversationId: conversation.id,
                role: "user",
                content: message,
            },
        });

        // 6. Susun riwayat percakapan untuk model AI
        const conversationHistory = conversation.messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        // 7. Panggil model OpenAI / Responses API
        const aiResponse = await openaiService.generateResponse({
            systemPrompt,
            userMessage: message,
            conversationHistory,
        });

        // 8. Simpan respons AI ke database
        const assistantMessage = await prisma.aiMessage.create({
            data: {
                conversationId: conversation.id,
                role: "assistant",
                content: aiResponse.reply,
                tokens: aiResponse.usage?.totalTokens || null,
            },
        });

        // Update timestamp percakapan
        await prisma.aiConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });

        return res.status(200).json({
            success: true,
            data: {
                conversationId: conversation.id,
                message: {
                    id: assistantMessage.id,
                    role: "assistant",
                    content: aiResponse.reply,
                    createdAt: assistantMessage.createdAt,
                },
                quota,
            },
        });
    } catch (error) {
        console.error("Chat with AI error:", error);

        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Terjadi kesalahan pada server saat memproses chat AI",
        });
    }
};

// ==========================================
// GET ALL CONVERSATIONS
// ==========================================
const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await prisma.aiConversation.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: {
                _count: {
                    select: { messages: true },
                },
            },
        });

        return res.status(200).json({
            success: true,
            data: conversations,
        });
    } catch (error) {
        console.error("Get conversations error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat mengambil daftar percakapan",
        });
    }
};

// ==========================================
// GET CONVERSATION BY ID
// ==========================================
const getConversationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const conversation = await prisma.aiConversation.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Percakapan tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            data: conversation,
        });
    } catch (error) {
        console.error("Get conversation by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat mengambil detail percakapan",
        });
    }
};

// ==========================================
// DELETE CONVERSATION
// ==========================================
const deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const conversation = await prisma.aiConversation.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Percakapan tidak ditemukan",
            });
        }

        await prisma.aiConversation.delete({
            where: { id },
        });

        return res.status(200).json({
            success: true,
            message: "Percakapan berhasil dihapus",
        });
    } catch (error) {
        console.error("Delete conversation error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat menghapus percakapan",
        });
    }
};

// ==========================================
// GET AI QUOTA STATUS
// ==========================================
const getAiQuota = async (req, res) => {
    try {
        const userId = req.user.id;
        const quota = await getQuotaStatus(userId);

        return res.status(200).json({
            success: true,
            data: quota,
        });
    } catch (error) {
        console.error("Get AI quota error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat mengambil status kuota AI",
        });
    }
};

// ==========================================
// SMART TASK PLANNER
// ==========================================
const planSmartTasks = async (req, res) => {
    try {
        const validation = plannerSuggestSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi sasaran perencanaan gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { goal, taskId, conversationId } = validation.data;
        const userId = req.user.id;

        // Konsumsi kuota secara aman terhadap concurrency
        let quota;
        try {
            quota = await checkAndConsumeQuota(userId);
        } catch (quotaError) {
            if (quotaError.status === 429) {
                return res.status(429).json({
                    success: false,
                    message: quotaError.message,
                    code: quotaError.code || "AI_QUOTA_EXCEEDED",
                    quota: quotaError.quota,
                });
            }
            throw quotaError;
        }

        // Panggil service AI Planner
        const planResult = await aiPlannerService.planTasks({
            userId,
            goal,
            taskId,
            conversationId,
        });

        return res.status(200).json({
            success: true,
            data: {
                ...planResult,
                quota,
            },
        });
    } catch (error) {
        console.error("Plan smart tasks error:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Terjadi kesalahan pada server saat merencanakan tugas dengan AI",
        });
    }
};

// ==========================================
// GET ACTION PROPOSALS
// ==========================================
const getProposals = async (req, res) => {
    try {
        const userId = req.user.id;
        const proposals = await aiActionEngineService.getProposals(userId, req.query);

        return res.status(200).json({
            success: true,
            data: proposals,
        });
    } catch (error) {
        console.error("Get proposals error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil daftar usulan tindakan",
        });
    }
};

// ==========================================
// GET PROPOSAL BY ID
// ==========================================
const getProposalById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const proposal = await aiActionEngineService.getProposalById(id, userId);

        return res.status(200).json({
            success: true,
            data: proposal,
        });
    } catch (error) {
        console.error("Get proposal by ID error:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Terjadi kesalahan saat mengambil detail usulan tindakan",
        });
    }
};

// ==========================================
// APPROVE PROPOSAL
// ==========================================
const approveProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await aiActionEngineService.approveAndExecute(id, userId);

        return res.status(200).json({
            success: true,
            message: "Usulan tindakan berhasil disetujui dan diterapkan",
            data: result,
        });
    } catch (error) {
        console.error("Approve proposal error:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Terjadi kesalahan saat menyetujui usulan tindakan",
        });
    }
};

// ==========================================
// REJECT PROPOSAL
// ==========================================
const rejectProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const updated = await aiActionEngineService.rejectProposal(id, userId);

        return res.status(200).json({
            success: true,
            message: "Usulan tindakan berhasil ditolak",
            data: updated,
        });
    } catch (error) {
        console.error("Reject proposal error:", error);
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Terjadi kesalahan saat menolak usulan tindakan",
        });
    }
};

module.exports = {
    chatWithAi,
    getConversations,
    getConversationById,
    deleteConversation,
    getAiQuota,
    planSmartTasks,
    getProposals,
    getProposalById,
    approveProposal,
    rejectProposal,
};
