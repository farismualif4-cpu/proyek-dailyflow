const rateLimit = require("express-rate-limit");

// Batasi 20 request per menit per pengguna terotentikasi (fallback ke IP)
const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 menit
    max: 20, // Maksimal 20 request per menit
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
        keyGeneratorIpFallback: false,
    },
    keyGenerator: (req) => {
        // Gunakan ID user jika login, jika tidak gunakan IP
        return req.user?.id || req.ip;
    },
    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            message: "Terlalu banyak permintaan AI dalam 1 menit. Harap tunggu sebentar.",
            code: "AI_RATE_LIMIT_EXCEEDED",
        });
    },
});

module.exports = aiRateLimiter;
