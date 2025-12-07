-- CreateTable
CREATE TABLE "active_sessions" (
    "id" TEXT NOT NULL,
    "socketId" TEXT NOT NULL,
    "userId" TEXT,
    "roomCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "active_sessions_socketId_key" ON "active_sessions"("socketId");

-- AddForeignKey
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
