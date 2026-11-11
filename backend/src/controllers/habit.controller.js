const prisma = require("../config/prisma");

const {
    createHabitSchema,
    updateHabitSchema,
    checkInSchema,
    historyQuerySchema,
} = require("../validators/habit.validator");

// ==========================================
// HELPER: Perhitungan Streak Kebiasaan
// ==========================================
const calculateStreaks = (logs) => {
    // Ambil log yang completed: true, hilangkan duplikasi tanggal, dan urutkan ascending
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

    // Cek apakah streak masih aktif (hari ini atau kemarin)
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
// 1. CREATE HABIT (Membuat Kebiasaan Baru)
// ==========================================
const createHabit = async (req, res) => {
    try {
        const validation = createHabitSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { name, description } = validation.data;

        const habit = await prisma.habit.create({
            data: {
                name,
                description: description ?? null,
                userId: req.user.id,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Kebiasaan berhasil dibuat",
            data: habit,
        });
    } catch (error) {
        console.error("Create habit error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 2. GET ALL HABITS (Mengambil Semua Kebiasaan)
// ==========================================
const getHabits = async (req, res) => {
    try {
        const habits = await prisma.habit.findMany({
            where: {
                userId: req.user.id,
            },
            include: {
                logs: {
                    orderBy: {
                        date: "desc",
                    },
                    take: 30, // 30 log terakhir untuk visualisasi frontend
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Tambahkan ringkasan streak untuk setiap habit
        const formattedHabits = habits.map((habit) => {
            const { currentStreak, bestStreak } = calculateStreaks(habit.logs);
            const totalCheckIns = habit.logs.filter((l) => l.completed).length;

            return {
                ...habit,
                currentStreak,
                bestStreak,
                totalCheckIns,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Daftar kebiasaan berhasil diambil",
            data: formattedHabits,
        });
    } catch (error) {
        console.error("Get habits error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 3. GET HABIT BY ID (Detail Kebiasaan)
// ==========================================
const getHabitById = async (req, res) => {
    try {
        const habit = await prisma.habit.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
            include: {
                logs: {
                    orderBy: {
                        date: "desc",
                    },
                },
            },
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: "Kebiasaan tidak ditemukan",
            });
        }

        const { currentStreak, bestStreak } = calculateStreaks(habit.logs);
        const totalCheckIns = habit.logs.filter((l) => l.completed).length;

        return res.status(200).json({
            success: true,
            data: {
                ...habit,
                currentStreak,
                bestStreak,
                totalCheckIns,
            },
        });
    } catch (error) {
        console.error("Get habit by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 4. UPDATE HABIT (Memperbarui Kebiasaan)
// ==========================================
const updateHabit = async (req, res) => {
    try {
        const validation = updateHabitSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        // Pastikan habit milik user yang sedang login
        const existingHabit = await prisma.habit.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingHabit) {
            return res.status(404).json({
                success: false,
                message: "Kebiasaan tidak ditemukan",
            });
        }

        const updatedHabit = await prisma.habit.update({
            where: {
                id: existingHabit.id,
            },
            data: validation.data,
        });

        return res.status(200).json({
            success: true,
            message: "Kebiasaan berhasil diperbarui",
            data: updatedHabit,
        });
    } catch (error) {
        console.error("Update habit error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 5. DELETE HABIT (Menghapus Kebiasaan)
// ==========================================
const deleteHabit = async (req, res) => {
    try {
        const existingHabit = await prisma.habit.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingHabit) {
            return res.status(404).json({
                success: false,
                message: "Kebiasaan tidak ditemukan",
            });
        }

        await prisma.habit.delete({
            where: {
                id: existingHabit.id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Kebiasaan berhasil dihapus",
        });
    } catch (error) {
        console.error("Delete habit error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 6. HABIT CHECK-IN (Mencatat / Toggle Check-in)
// ==========================================
const checkInHabit = async (req, res) => {
    try {
        const validation = checkInSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi gagal",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const existingHabit = await prisma.habit.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingHabit) {
            return res.status(404).json({
                success: false,
                message: "Kebiasaan tidak ditemukan",
            });
        }

        // Tentukan tanggal check-in (format YYYY-MM-DD standar UTC midnight)
        const dateInput = validation.data.date ?? new Date().toISOString().split("T")[0];
        const targetDate = new Date(`${dateInput}T00:00:00.000Z`);
        const isCompleted = validation.data.completed !== undefined ? validation.data.completed : true;

        // Gunakan upsert dengan unique constraint @@unique([habitId, date]) untuk mencegah duplikasi
        const habitLog = await prisma.habitLog.upsert({
            where: {
                habitId_date: {
                    habitId: existingHabit.id,
                    date: targetDate,
                },
            },
            update: {
                completed: isCompleted,
            },
            create: {
                habitId: existingHabit.id,
                date: targetDate,
                completed: isCompleted,
            },
        });

        return res.status(200).json({
            success: true,
            message: isCompleted
                ? "Check-in kebiasaan berhasil dicatat"
                : "Status check-in kebiasaan diperbarui",
            data: habitLog,
        });
    } catch (error) {
        console.error("Check-in habit error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 7. HABIT HISTORY (Riwayat Check-in)
// ==========================================
const getHabitHistory = async (req, res) => {
    try {
        const queryValidation = historyQuerySchema.safeParse(req.query);

        if (!queryValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Validasi parameter query gagal",
                errors: queryValidation.error.flatten().fieldErrors,
            });
        }

        const existingHabit = await prisma.habit.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingHabit) {
            return res.status(404).json({
                success: false,
                message: "Kebiasaan tidak ditemukan",
            });
        }

        const { startDate, endDate } = queryValidation.data;
        const logWhere = {
            habitId: existingHabit.id,
        };

        if (startDate || endDate) {
            logWhere.date = {};
            if (startDate) {
                logWhere.date.gte = new Date(`${startDate}T00:00:00.000Z`);
            }
            if (endDate) {
                logWhere.date.lte = new Date(`${endDate}T23:59:59.999Z`);
            }
        }

        const logs = await prisma.habitLog.findMany({
            where: logWhere,
            orderBy: {
                date: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Riwayat check-in berhasil diambil",
            data: logs,
        });
    } catch (error) {
        console.error("Get habit history error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

// ==========================================
// 8. HABIT STATISTICS (Statistik Seluruh Kebiasaan)
// ==========================================
const getHabitStatistics = async (req, res) => {
    try {
        const habits = await prisma.habit.findMany({
            where: {
                userId: req.user.id,
            },
            include: {
                logs: true,
            },
        });

        const totalHabits = habits.length;

        if (totalHabits === 0) {
            return res.status(200).json({
                success: true,
                message: "Statistik kebiasaan berhasil diambil",
                data: {
                    totalHabits: 0,
                    totalCheckIns: 0,
                    todayCheckIns: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                    completionRate: 0,
                },
            });
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

        let totalCheckIns = 0;
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
                    totalCheckIns += 1;
                    const logDate = new Date(log.date);
                    if (logDate.toISOString().split("T")[0] === todayStr) {
                        todayCheckIns += 1;
                    }
                }
            }
        }

        // Completion rate hari ini (% habit yang selesai hari ini)
        const completionRate = totalHabits > 0
            ? Math.round((todayCheckIns / totalHabits) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            message: "Statistik kebiasaan berhasil diambil",
            data: {
                totalHabits,
                totalCheckIns,
                todayCheckIns,
                currentStreak: highestCurrentStreak,
                bestStreak: highestBestStreak,
                completionRate,
            },
        });
    } catch (error) {
        console.error("Get habit statistics error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

module.exports = {
    createHabit,
    getHabits,
    getHabitById,
    updateHabit,
    deleteHabit,
    checkInHabit,
    getHabitHistory,
    getHabitStatistics,
};

