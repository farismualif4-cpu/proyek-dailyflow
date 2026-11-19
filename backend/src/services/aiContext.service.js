const prisma = require("../config/prisma");

/**
 * Mengambil ringkasan konteks data produktivitas pengguna secara aman (multi-tenant strictly scoped by userId).
 * Data ini digunakan sebagai sistem acuan pengetahuan AI untuk menjawab pertanyaan pengguna.
 * 
 * @param {string} userId
 * @returns {Promise<string>} String teks konteks yang terformat ringkas
 */
const getUserContext = async (userId) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [user, tasks, notes, habits, reminders] = await Promise.all([
        // 1. Data Profil User
        prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        }),

        // 2. Tugas Aktif (Belum Selesai)
        prisma.task.findMany({
            where: {
                userId,
                status: { in: ["PENDING", "IN_PROGRESS"] },
            },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
            take: 15,
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
            },
        }),

        // 3. Catatan Terbaru
        prisma.note.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: {
                id: true,
                title: true,
                category: true,
                content: true,
            },
        }),

        // 4. Kebiasaan Aktif Beserta Status Check-In Hari Ini
        prisma.habit.findMany({
            where: { userId },
            take: 10,
            select: {
                id: true,
                name: true,
                description: true,
                logs: {
                    where: { date: today },
                    select: { completed: true },
                },
            },
        }),

        // 5. Pengingat Mendatang (Belum Terkirim)
        prisma.reminder.findMany({
            where: {
                userId,
                isSent: false,
            },
            orderBy: { remindAt: "asc" },
            take: 5,
            select: {
                id: true,
                title: true,
                remindAt: true,
                message: true,
            },
        }),
    ]);

    const userName = user?.name || "Pengguna";

    let contextText = `=== KONTEKS DATA PRODUKTIVITAS PENGGUNA (${userName}) ===\n`;

    // Tasks Section
    contextText += `\n[TUGAS AKTIF (${tasks.length} item)]:\n`;
    if (tasks.length === 0) {
        contextText += "- Tidak ada tugas aktif saat ini.\n";
    } else {
        tasks.forEach((t) => {
            const due = t.dueDate ? ` | Tenggat: ${t.dueDate.toISOString().split("T")[0]}` : "";
            contextText += `- [ID: ${t.id}] ${t.title} (Status: ${t.status}, Prioritas: ${t.priority}${due})\n`;
        });
    }

    // Habits Section
    contextText += `\n[KEBIASAAN / HABITS (${habits.length} item)]:\n`;
    if (habits.length === 0) {
        contextText += "- Belum ada kebiasaan yang didaftarkan.\n";
    } else {
        habits.forEach((h) => {
            const checkedToday = h.logs.length > 0 && h.logs[0].completed;
            contextText += `- [ID: ${h.id}] ${h.name} (Check-in Hari Ini: ${checkedToday ? "SUDAH" : "BELUM"})\n`;
        });
    }

    // Notes Section
    contextText += `\n[CATATAN TERBARU (${notes.length} item)]:\n`;
    if (notes.length === 0) {
        contextText += "- Belum ada catatan.\n";
    } else {
        notes.forEach((n) => {
            const cat = n.category ? ` [Kategori: ${n.category}]` : "";
            const snippet = n.content.length > 100 ? `${n.content.slice(0, 100)}...` : n.content;
            contextText += `- "${n.title}"${cat}: ${snippet || "(Kosong)"}\n`;
        });
    }

    // Reminders Section
    contextText += `\n[PENGINGAT MENDATANG (${reminders.length} item)]:\n`;
    if (reminders.length === 0) {
        contextText += "- Tidak ada pengingat mendatang.\n";
    } else {
        reminders.forEach((r) => {
            contextText += `- [ID: ${r.id}] ${r.title} (Waktu: ${r.remindAt.toISOString()})\n`;
        });
    }

    contextText += `\n=========================================================`;

    return contextText;
};

module.exports = {
    getUserContext,
};
