const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const aiRateLimiter = require("../middleware/aiRateLimit.middleware");

const {
    chatWithAi,
    getConversations,
    getConversationById,
    deleteConversation,
    getAiQuota,
} = require("../controllers/ai.controller");

// Semua endpoint AI wajib login / terautentikasi
router.use(authMiddleware);

// POST /api/ai/chat (dengan rate limiting per menit)
router.post("/chat", aiRateLimiter, chatWithAi);

// GET /api/ai/conversations
router.get("/conversations", getConversations);

// GET /api/ai/conversations/:id
router.get("/conversations/:id", getConversationById);

// DELETE /api/ai/conversations/:id
router.delete("/conversations/:id", deleteConversation);

// GET /api/ai/quota
router.get("/quota", getAiQuota);

module.exports = router;
