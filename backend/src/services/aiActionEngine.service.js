const prisma = require("../config/prisma");

// Batas masa berlaku usulan tindakan (48 jam)
const PROPOSAL_EXPIRATION_HOURS = 48;

const isProposalExpired = (proposal) => {
    if (proposal.status === "EXPIRED") return true;
    if (proposal.status !== "PENDING") return false;
    const ageInHours = (Date.now() - new Date(proposal.createdAt).getTime()) / (1000 * 60 * 60);
    return ageInHours > PROPOSAL_EXPIRATION_HOURS;
};

/**
 * Action Approval Engine
 * 
 * Bertanggung jawab mengeksekusi atau menolak usulan tindakan AI (AiActionProposal)
 * setelah pengguna memberikan persetujuan eksplisit.
 * Menjamin multi-tenant strictly scoped by userId untuk proposal dan task terkait.
 */
class AiActionEngineService {
    /**
     * Menyetujui dan menerapkan usulan tindakan ke database secara permanen.
     * 
     * @param {string} proposalId
     * @param {string} userId
     * @returns {Promise<{ proposal: Object, result: Object }>}
     */
    async approveAndExecute(proposalId, userId) {
        // 1. Ambil proposal dan pastikan milik user aktif
        const proposal = await prisma.aiActionProposal.findFirst({
            where: {
                id: proposalId,
                userId,
            },
        });

        if (!proposal) {
            const err = new Error("Usulan tindakan tidak ditemukan atau bukan milik Anda.");
            err.status = 404;
            throw err;
        }

        // Cek apakah status sudah bukan PENDING
        if (proposal.status !== "PENDING") {
            const err = new Error(
                `Usulan tindakan sudah tidak dapat diproses karena berstatus: ${proposal.status}`
            );
            err.status = 400;
            throw err;
        }

        // Cek kedaluwarsa proposal (EXPIRED)
        if (isProposalExpired(proposal)) {
            await prisma.aiActionProposal.update({
                where: { id: proposalId },
                data: {
                    status: "EXPIRED",
                    updatedAt: new Date(),
                },
            });
            const err = new Error(
                "Usulan tindakan telah kedaluwarsa (berstatus: EXPIRED) dan tidak dapat diterapkan."
            );
            err.status = 400;
            throw err;
        }

        let executionResult = null;
        const actionData = proposal.actionData || {};

        // 2. Terapkan tindakan ke database sesuai tipe usulan
        switch (proposal.type) {
            case "CREATE_TASK": {
                const { title, description, priority, dueDate } = actionData;
                if (!title || typeof title !== "string") {
                    const err = new Error("Data usulan tugas tidak valid: judul wajib ada.");
                    err.status = 400;
                    throw err;
                }

                executionResult = await prisma.task.create({
                    data: {
                        title: title.trim(),
                        description: description ? description.trim() : null,
                        priority: ["LOW", "MEDIUM", "HIGH"].includes(priority) ? priority : "MEDIUM",
                        status: "PENDING",
                        dueDate: dueDate ? new Date(dueDate) : null,
                        userId,
                    },
                });
                break;
            }

            case "UPDATE_TASK": {
                const { taskId, title, description, priority, status, dueDate } = actionData;
                if (!taskId) {
                    const err = new Error("ID tugas yang akan diperbarui tidak ditemukan dalam usulan.");
                    err.status = 400;
                    throw err;
                }

                // Validasi kepemilikan task oleh userId
                const existingTask = await prisma.task.findFirst({
                    where: { id: taskId, userId },
                });

                if (!existingTask) {
                    const err = new Error("Tugas yang akan diperbarui tidak ditemukan atau bukan milik Anda.");
                    err.status = 404;
                    throw err;
                }

                // Whitelist: Hanya field yang diizinkan yang dapat diperbarui
                const updateData = {};
                if (title !== undefined && typeof title === "string") updateData.title = title.trim();
                if (description !== undefined) updateData.description = description ? description.trim() : null;
                if (priority !== undefined && ["LOW", "MEDIUM", "HIGH"].includes(priority)) updateData.priority = priority;
                if (status !== undefined && ["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) updateData.status = status;
                if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

                if (Object.keys(updateData).length === 0) {
                    const err = new Error("Tidak ada field valid yang dapat diperbarui.");
                    err.status = 400;
                    throw err;
                }

                executionResult = await prisma.task.update({
                    where: { id: taskId },
                    data: updateData,
                });
                break;
            }

            case "BATCH_CREATE_TASKS": {
                const tasksToCreate = Array.isArray(actionData.tasks) ? actionData.tasks : [];
                if (tasksToCreate.length === 0) {
                    const err = new Error("Daftar subtugas yang akan dibuat kosong.");
                    err.status = 400;
                    throw err;
                }

                // AUDIT ITEM 6: Gunakan Prisma Transaction ($transaction) agar pembuatan batch atomik
                const createOperations = tasksToCreate
                    .filter((item) => item.title && typeof item.title === "string")
                    .map((item) =>
                        prisma.task.create({
                            data: {
                                title: item.title.trim(),
                                description: item.description ? item.description.trim() : null,
                                priority: ["LOW", "MEDIUM", "HIGH"].includes(item.priority) ? item.priority : "MEDIUM",
                                status: "PENDING",
                                dueDate: item.dueDate ? new Date(item.dueDate) : null,
                                userId,
                            },
                        })
                    );

                if (createOperations.length === 0) {
                    const err = new Error("Tidak ada subtugas dengan judul valid yang dapat dibuat.");
                    err.status = 400;
                    throw err;
                }

                // Eksekusi seluruh operasi pembuatan task secara atomik dalam transaksi Prisma
                executionResult = await prisma.$transaction(createOperations);
                break;
            }

            case "DELETE_TASK": {
                const { taskId } = actionData;
                if (!taskId) {
                    const err = new Error("ID tugas yang akan dihapus tidak ditemukan dalam usulan.");
                    err.status = 400;
                    throw err;
                }

                // Validasi kepemilikan task oleh userId
                const existingTask = await prisma.task.findFirst({
                    where: { id: taskId, userId },
                });

                if (!existingTask) {
                    const err = new Error("Tugas yang akan dihapus tidak ditemukan atau bukan milik Anda.");
                    err.status = 404;
                    throw err;
                }

                executionResult = await prisma.task.delete({
                    where: { id: taskId },
                });
                break;
            }

            default: {
                const err = new Error(`Tipe usulan tindakan tidak dikenal: ${proposal.type}`);
                err.status = 400;
                throw err;
            }
        }

        // 3. Tandai proposal sebagai APPROVED
        const updatedProposal = await prisma.aiActionProposal.update({
            where: { id: proposalId },
            data: {
                status: "APPROVED",
                updatedAt: new Date(),
            },
        });

        return {
            proposal: updatedProposal,
            result: executionResult,
        };
    }

    /**
     * Menolak usulan tindakan tanpa mengubah data Task sama sekali.
     * 
     * @param {string} proposalId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async rejectProposal(proposalId, userId) {
        const proposal = await prisma.aiActionProposal.findFirst({
            where: {
                id: proposalId,
                userId,
            },
        });

        if (!proposal) {
            const err = new Error("Usulan tindakan tidak ditemukan atau bukan milik Anda.");
            err.status = 404;
            throw err;
        }

        if (proposal.status !== "PENDING") {
            const err = new Error(
                `Usulan tindakan sudah tidak dapat ditolak karena berstatus: ${proposal.status}`
            );
            err.status = 400;
            throw err;
        }

        if (isProposalExpired(proposal)) {
            await prisma.aiActionProposal.update({
                where: { id: proposalId },
                data: {
                    status: "EXPIRED",
                    updatedAt: new Date(),
                },
            });
            const err = new Error(
                "Usulan tindakan telah kedaluwarsa (berstatus: EXPIRED) dan tidak dapat ditolak."
            );
            err.status = 400;
            throw err;
        }

        const updatedProposal = await prisma.aiActionProposal.update({
            where: { id: proposalId },
            data: {
                status: "REJECTED",
                updatedAt: new Date(),
            },
        });

        return updatedProposal;
    }

    /**
     * Mengambil daftar usulan tindakan milik pengguna aktif.
     * 
     * @param {string} userId
     * @param {Object} [filters]
     * @returns {Promise<Array>}
     */
    async getProposals(userId, filters = {}) {
        // Auto-expire proposal PENDING yang sudah melewati batas waktu 48 jam
        const expiredThreshold = new Date(Date.now() - PROPOSAL_EXPIRATION_HOURS * 60 * 60 * 1000);
        await prisma.aiActionProposal.updateMany({
            where: {
                userId,
                status: "PENDING",
                createdAt: { lt: expiredThreshold },
            },
            data: { status: "EXPIRED" },
        });

        const where = { userId };
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.conversationId) {
            where.conversationId = filters.conversationId;
        }

        return await prisma.aiActionProposal.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 30,
        });
    }

    /**
     * Mengambil satu proposal berdasarkan ID milik pengguna.
     * 
     * @param {string} proposalId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async getProposalById(proposalId, userId) {
        const proposal = await prisma.aiActionProposal.findFirst({
            where: {
                id: proposalId,
                userId,
            },
        });

        if (!proposal) {
            const err = new Error("Usulan tindakan tidak ditemukan.");
            err.status = 404;
            throw err;
        }

        if (isProposalExpired(proposal)) {
            await prisma.aiActionProposal.update({
                where: { id: proposalId },
                data: {
                    status: "EXPIRED",
                    updatedAt: new Date(),
                },
            });
            proposal.status = "EXPIRED";
        }

        return proposal;
    }
}

module.exports = new AiActionEngineService();
