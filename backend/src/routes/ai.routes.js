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
    planSmartTasks,
    getProposals,
    getProposalById,
    approveProposal,
    rejectProposal,
} = require("../controllers/ai.controller");

// Semua endpoint AI wajib login / terautentikasi
router.use(authMiddleware);

// POST /api/ai/chat (dengan rate limiting per menit)
router.post("/chat", aiRateLimiter, chatWithAi);

// POST /api/ai/planner/suggest (dengan rate limiting per menit)
router.post("/planner/suggest", aiRateLimiter, planSmartTasks);

// GET /api/ai/conversations
router.get("/conversations", getConversations);

// GET /api/ai/conversations/:id
router.get("/conversations/:id", getConversationById);

// DELETE /api/ai/conversations/:id
router.delete("/conversations/:id", deleteConversation);

// GET /api/ai/quota
router.get("/quota", getAiQuota);

// Action Proposals Endpoints
// GET /api/ai/proposals
router.get("/proposals", getProposals);

// GET /api/ai/proposals/:id
router.get("/proposals/:id", getProposalById);

// POST /api/ai/proposals/:id/approve
router.post("/proposals/:id/approve", approveProposal);

// POST /api/ai/proposals/:id/reject
router.post("/proposals/:id/reject", rejectProposal);

module.exports = router;
