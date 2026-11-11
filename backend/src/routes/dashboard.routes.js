const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { getDashboardData } = require("../controllers/dashboard.controller");

// Endpoint dashboard diproteksi JWT
router.use(authMiddleware);

// GET /api/dashboard
router.get("/", getDashboardData);

module.exports = router;

