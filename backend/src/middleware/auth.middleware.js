
const jwt = require("jsonwebtoken");

// Middleware untuk memeriksa token pengguna
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Periksa apakah token tersedia
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Akses ditolak. Token tidak ditemukan.",
            });
        }

        // Ambil token dari header
        const token = authHeader.split(" ")[1];

        // Periksa JWT_SECRET
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET belum dikonfigurasi");
        }

        // Verifikasi token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Simpan informasi pengguna ke request
        req.user = {
            id: decoded.userId,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token tidak valid atau sudah kedaluwarsa.",
        });
    }
};

module.exports = authMiddleware;
