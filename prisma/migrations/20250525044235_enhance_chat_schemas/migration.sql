/*
  Warnings:

  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "APIRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "correlationId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "userId" TEXT,
    "chatSessionId" TEXT,
    "modelName" TEXT,
    "messageCount" INTEGER,
    "requestSize" INTEGER,
    "hasStream" BOOLEAN NOT NULL DEFAULT false,
    "statusCode" INTEGER NOT NULL,
    "responseSize" INTEGER,
    "responseTime" INTEGER NOT NULL,
    "memoryUsage" REAL,
    "cpuUsage" REAL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "rateLimited" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "APIRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "APIRequest_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "temperature" REAL DEFAULT 0.7,
    "topP" REAL DEFAULT 0.9,
    "topK" INTEGER DEFAULT 40,
    "repeatPenalty" REAL DEFAULT 1.1,
    "presencePenalty" REAL,
    "frequencyPenalty" REAL,
    "maxTokens" INTEGER,
    "stopSequences" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avgResponseTime" REAL,
    "totalCost" REAL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatSession_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "OllamaModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatSession" ("createdAt", "id", "modelId", "name", "updatedAt", "userId") SELECT "createdAt", "id", "modelId", "name", "updatedAt", "userId" FROM "ChatSession";
DROP TABLE "ChatSession";
ALTER TABLE "new_ChatSession" RENAME TO "ChatSession";
CREATE INDEX "ChatSession_userId_lastActivity_idx" ON "ChatSession"("userId", "lastActivity");
CREATE INDEX "ChatSession_modelId_status_idx" ON "ChatSession"("modelId", "status");
CREATE INDEX "ChatSession_status_lastActivity_idx" ON "ChatSession"("status", "lastActivity");
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatSessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "finishReason" TEXT,
    "model" TEXT,
    "totalDuration" INTEGER,
    "loadDuration" INTEGER,
    "promptEvalDuration" INTEGER,
    "evalDuration" INTEGER,
    "promptEvalCount" INTEGER,
    "evalCount" INTEGER,
    "requestId" TEXT,
    "responseTime" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentiment" TEXT,
    "language" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatSessionId", "content", "createdAt", "evalDuration", "id", "loadDuration", "promptEvalDuration", "role", "totalDuration") SELECT "chatSessionId", "content", "createdAt", "evalDuration", "id", "loadDuration", "promptEvalDuration", "role", "totalDuration" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_chatSessionId_createdAt_idx" ON "Message"("chatSessionId", "createdAt");
CREATE INDEX "Message_role_createdAt_idx" ON "Message"("role", "createdAt");
CREATE INDEX "Message_requestId_idx" ON "Message"("requestId");
CREATE INDEX "Message_isDeleted_chatSessionId_idx" ON "Message"("isDeleted", "chatSessionId");
CREATE TABLE "new_OllamaModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "digest" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "parameters" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isDownloaded" BOOLEAN NOT NULL DEFAULT false,
    "downloadProgress" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_DOWNLOADED',
    "error" TEXT,
    "description" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "license" TEXT,
    "homepage" TEXT,
    "contextLength" INTEGER,
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" REAL,
    "successRate" REAL,
    "lastUsedAt" DATETIME,
    "costPerToken" REAL DEFAULT 0.0,
    "totalCost" REAL DEFAULT 0.0
);
INSERT INTO "new_OllamaModel" ("createdAt", "digest", "downloadProgress", "error", "family", "format", "id", "isDownloaded", "name", "parameters", "size", "status", "updatedAt") SELECT "createdAt", "digest", "downloadProgress", "error", "family", "format", "id", "isDownloaded", "name", "parameters", "size", "status", "updatedAt" FROM "OllamaModel";
DROP TABLE "OllamaModel";
ALTER TABLE "new_OllamaModel" RENAME TO "OllamaModel";
CREATE UNIQUE INDEX "OllamaModel_name_key" ON "OllamaModel"("name");
CREATE INDEX "OllamaModel_status_isDownloaded_idx" ON "OllamaModel"("status", "isDownloaded");
CREATE INDEX "OllamaModel_name_status_idx" ON "OllamaModel"("name", "status");
CREATE INDEX "OllamaModel_usageCount_lastUsedAt_idx" ON "OllamaModel"("usageCount", "lastUsedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "defaultModelId" TEXT,
    "defaultTemperature" REAL DEFAULT 0.7,
    "defaultTopP" REAL DEFAULT 0.9,
    "defaultTopK" INTEGER DEFAULT 40,
    "defaultMaxTokens" INTEGER,
    "defaultSystemPrompt" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" BIGINT NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_defaultModelId_fkey" FOREIGN KEY ("defaultModelId") REFERENCES "OllamaModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "updatedAt") SELECT "createdAt", "email", "id", "name", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_isActive_lastActiveAt_idx" ON "User"("isActive", "lastActiveAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "APIRequest_correlationId_key" ON "APIRequest"("correlationId");

-- CreateIndex
CREATE INDEX "APIRequest_endpoint_createdAt_idx" ON "APIRequest"("endpoint", "createdAt");

-- CreateIndex
CREATE INDEX "APIRequest_userId_createdAt_idx" ON "APIRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "APIRequest_statusCode_createdAt_idx" ON "APIRequest"("statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "APIRequest_correlationId_idx" ON "APIRequest"("correlationId");

-- CreateIndex
CREATE INDEX "APIRequest_modelName_createdAt_idx" ON "APIRequest"("modelName", "createdAt");
