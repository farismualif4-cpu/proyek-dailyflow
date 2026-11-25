-- CreateEnum
CREATE TYPE "ActionProposalType" AS ENUM ('CREATE_TASK', 'UPDATE_TASK', 'BATCH_CREATE_TASKS', 'DELETE_TASK');

-- CreateEnum
CREATE TYPE "ActionProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AiActionProposal" (
    "id" TEXT NOT NULL,
    "type" "ActionProposalType" NOT NULL,
    "status" "ActionProposalStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actionData" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,

    CONSTRAINT "AiActionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiActionProposal_userId_idx" ON "AiActionProposal"("userId");

-- CreateIndex
CREATE INDEX "AiActionProposal_userId_status_idx" ON "AiActionProposal"("userId", "status");

-- CreateIndex
CREATE INDEX "AiActionProposal_conversationId_idx" ON "AiActionProposal"("conversationId");

-- AddForeignKey
ALTER TABLE "AiActionProposal" ADD CONSTRAINT "AiActionProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiActionProposal" ADD CONSTRAINT "AiActionProposal_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
