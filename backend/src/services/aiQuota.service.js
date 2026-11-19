const prisma = require("../config/prisma");

// Helper untuk mendapatkan awal hari UTC
const getTodayUtcDate = () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
};

/**
 * Memeriksa dan mengonsumsi kuota AI harian secara aman terhadap concurrency.
 * Menggunakan operasi SQL atomik langsung di PostgreSQL untuk menjamin tidak ada race condition
 * dan sepenuhnya kompatibel dengan connection pooling Neon/PgBouncer.
 * 
 * @param {string} userId
 * @returns {Promise<{ used: number, limit: number, remaining: number }>}
 */
const checkAndConsumeQuota = async (userId) => {
    const limit = parseInt(process.env.AI_DAILY_LIMIT || "30", 10);
    const today = getTodayUtcDate();

    // 1. Pastikan baris kuota hari ini tersedia (upsert atomik)
    await prisma.aiUsageLog.upsert({
        where: {
            userId_date: {
                userId,
                date: today,
            },
        },
        create: {
            userId,
            date: today,
            requestCount: 0,
        },
        update: {},
    });

    // 2. Lakukan atomic conditional UPDATE langsung di PostgreSQL.
    // Query ini mengunci baris secara atomik di level engine PostgreSQL.
    // Jika requestCount < limit, nilai di-increment dan dikembalikan.
    // Jika requestCount >= limit, 0 baris diperbarui, menjamin tidak ada over-quota.
    const updatedRows = await prisma.$queryRaw`
        UPDATE "AiUsageLog"
        SET "requestCount" = "requestCount" + 1, "updatedAt" = NOW()
        WHERE "userId" = ${userId}
          AND "date" = ${today}::date
          AND "requestCount" < ${limit}
        RETURNING "requestCount"
    `;

    // 3. Jika tidak ada baris yang diperbarui, berarti kuota harian telah tercapai
    if (!updatedRows || updatedRows.length === 0) {
        const currentRecord = await prisma.aiUsageLog.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
        });

        const currentCount = currentRecord?.requestCount ?? limit;

        const err = new Error(
            `Batas kuota AI harian Anda telah tercapai (${currentCount}/${limit} permintaan). Silakan coba lagi besok.`
        );
        err.status = 429;
        err.code = "AI_QUOTA_EXCEEDED";
        err.quota = {
            used: currentCount,
            limit,
            remaining: 0,
        };
        throw err;
    }

    const newCount = Number(updatedRows[0].requestCount);

    return {
        used: newCount,
        limit,
        remaining: Math.max(0, limit - newCount),
    };
};

/**
 * Mengambil status kuota AI saat ini untuk pengguna tanpa mengurangi kuota.
 * 
 * @param {string} userId
 * @returns {Promise<{ used: number, limit: number, remaining: number, isExceeded: boolean }>}
 */
const getQuotaStatus = async (userId) => {
    const limit = parseInt(process.env.AI_DAILY_LIMIT || "30", 10);
    const today = getTodayUtcDate();

    const record = await prisma.aiUsageLog.findUnique({
        where: {
            userId_date: {
                userId,
                date: today,
            },
        },
    });

    const used = record?.requestCount || 0;
    return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        isExceeded: used >= limit,
    };
};

module.exports = {
    checkAndConsumeQuota,
    getQuotaStatus,
};
