/*
  Warnings:

  - You are about to drop the `Model` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OllamaModelDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `metadata` on the `Message` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "OllamaModelDetails_modelId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Model";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OllamaModelDetails";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "OllamaModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "parameters" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isDownloaded" BOOLEAN NOT NULL DEFAULT false,
    "downloadProgress" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_DOWNLOADED',
    "error" TEXT
);

-- CreateTable
CREATE TABLE "OllamaModelConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "temperature" REAL DEFAULT 0.7,
    "topP" REAL DEFAULT 0.9,
    "topK" INTEGER DEFAULT 40,
    "repeatPenalty" REAL DEFAULT 1.1,
    "presencePenalty" REAL,
    "frequencyPenalty" REAL,
    "stopSequences" TEXT NOT NULL DEFAULT '[]',
    "maxTokens" INTEGER,
    "systemPrompt" TEXT,
    "contextWindow" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OllamaModelConfiguration_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "OllamaModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatSession_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "OllamaModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatSession" ("createdAt", "id", "modelId", "name", "updatedAt", "userId") SELECT "createdAt", "id", "modelId", "name", "updatedAt", "userId" FROM "ChatSession";
DROP TABLE "ChatSession";
ALTER TABLE "new_ChatSession" RENAME TO "ChatSession";
CREATE TABLE "new_MCPServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "port" INTEGER NOT NULL,
    "host" TEXT NOT NULL DEFAULT 'localhost',
    "maxRequests" INTEGER NOT NULL DEFAULT 10,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "modelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MCPServer_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "OllamaModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MCPServer" ("createdAt", "host", "id", "maxRequests", "modelId", "name", "port", "status", "timeout", "updatedAt") SELECT "createdAt", "host", "id", "maxRequests", "modelId", "name", "port", "status", "timeout", "updatedAt" FROM "MCPServer";
DROP TABLE "MCPServer";
ALTER TABLE "new_MCPServer" RENAME TO "MCPServer";
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatSessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDuration" INTEGER,
    "loadDuration" INTEGER,
    "promptEvalDuration" INTEGER,
    "evalDuration" INTEGER,
    CONSTRAINT "Message_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatSessionId", "content", "createdAt", "id", "role") SELECT "chatSessionId", "content", "createdAt", "id", "role" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OllamaModel_name_key" ON "OllamaModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OllamaModelConfiguration_modelId_key" ON "OllamaModelConfiguration"("modelId");
