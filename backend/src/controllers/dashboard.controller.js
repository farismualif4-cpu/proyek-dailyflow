const prisma = require("../config/prisma");

// Helper untuk menghitung Current Streak dan Best Streak
const calculateStreaks = (logs) => {
    const completedDates = logs
        .filter((log) => log.completed)
        .map((log) => {
            const d = new Date(log.date);
            return d.toISOString().split("T")[0];
        })
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort();

    if (completedDates.length === 0) {
        return { currentStreak: 0, bestStreak: 0 };
    }

    let bestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    for (const dateStr of completedDates) {
        const currentDate = new Date(`${dateStr}T00:00:00.000Z`);

        if (!prevDate) {
            tempStreak = 1;
        } else {
            const diffTime = currentDate - prevDate;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak += 1;
            } else if (diffDays > 1) {
                tempStreak = 1;
            }
        }

        if (tempStreak > bestStreak) {
            bestStreak = tempStreak;
        }

        prevDate = currentDate;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(`${todayStr}T00:00:00.000Z`);
    const lastCompletedDate = new Date(
        `${completedDates[completedDates.length - 1]}T00:00:00.000Z`
    );
    const daysSinceLast = Math.round((today - lastCompletedDate) / (1000 * 60 * 60 * 24));

    let currentStreak = 0;
    if (daysSinceLast === 0 || daysSinceLast === 1) {
        currentStreak = tempStreak;
    }

    return { currentStreak, bestStreak };
};

// ==========================================
// GET DASHBOARD OVERVIEW DATA
// ==========================================
const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        const todayStr = new Date().toISOString().split("T")[0];

        // Eksekusi query agregasi secara paralel untuk efisiensi maksimal
        const [taskCounts, habits, upcomingReminders, recentTasks, recentNotes] =
            await Promise.all([
                // 1. Agregasi tugas berdasarkan status
                prisma.task.groupBy({
                    by: ["status"],
                    where: { userId },
                    _count: { status: true },
                }),

                // 2. Data kebiasaan beserta riwayat check-in
                prisma.habit.findMany({
                    where: { userId },
                    include: {
                        logs: {
                            orderBy: { date: "desc" },
                        },
                    },
                }),

                // 3. Pengingat mendatang yang belum selesai/terkirim
                prisma.reminder.findMany({
                    where: {
                        userId,
                        isSent: false,
                    },
                    include: {
                        task: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                priority: true,
                            },
                        },
                    },
                    orderBy: {
                        remindAt: "asc",
                    },
                    take: 5,
                }),

                // 4. Daftar tugas terbaru
                prisma.task.findMany({
                    where: { userId },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                }),

                // 5. Daftar catatan terbaru
                prisma.note.findMany({
                    where: { userId },
                    orderBy: { updatedAt: "desc" },
                    take: 5,
                }),
            ]);

        // Hitung metrik tugas
        let pending = 0;
        let inProgress = 0;
        let completed = 0;

        for (const item of taskCounts) {
            if (item.status === "PENDING") pending = item._count.status;
            if (item.status === "IN_PROGRESS") inProgress = item._count.status;
            if (item.status === "COMPLETED") completed = item._count.status;
        }

        const totalTasks = pending + inProgress + completed;
        const taskCompletionRate =
            totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        // Hitung metrik kebiasaan
        const totalHabits = habits.length;
        let todayCheckIns = 0;
        let highestCurrentStreak = 0;
        let highestBestStreak = 0;

        for (const habit of habits) {
            const { currentStreak, bestStreak } = calculateStreaks(habit.logs);

            if (currentStreak > highestCurrentStreak) {
                highestCurrentStreak = currentStreak;
            }
            if (bestStreak > highestBestStreak) {
                highestBestStreak = bestStreak;
            }

            for (const log of habit.logs) {
                if (log.completed) {
                    const logDate = new Date(log.date);
                    if (logDate.toISOString().split("T")[0] === todayStr) {
                        todayCheckIns += 1;
                    }
                }
            }
        }

        const habitCompletionRate =
            totalHabits > 0
                ? Math.round((todayCheckIns / totalHabits) * 100)
                : 0;

        return res.status(200).json({
            success: true,
            message: "Data dashboard berhasil diambil",
            data: {
                tasks: {
                    total: totalTasks,
                    pending,
                    inProgress,
                    completed,
                    completionRate: taskCompletionRate,
                },
                habits: {
                    total: totalHabits,
                    todayCheckIns,
                    completionRate: habitCompletionRate,
                    currentStreak: highestCurrentStreak,
                    bestStreak: highestBestStreak,
                },
                upcomingReminders,
                recentTasks,
                recentNotes,
            },
        });
    } catch (error) {
        console.error("Get dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

module.exports = {
    getDashboardData,
};

