const { PrismaClient } = require("@prisma/client");

// Membuat satu instance Prisma Client
const prisma = new PrismaClient();

// Mengekspor Prisma Client agar bisa digunakan di seluruh backend
module.exports = prisma;