-- First, create the new tables
CREATE TABLE "OllamaModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "parameters" TEXT,
    "isDownloaded" BOOLEAN NOT NULL DEFAULT false,
    "downloadProgress" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_DOWNLOADED',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "OllamaModelConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL UNIQUE,
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
    FOREIGN KEY ("modelId") REFERENCES "OllamaModel" ("id") ON DELETE CASCADE
);

-- Create unique index on OllamaModel name
CREATE UNIQUE INDEX "OllamaModel_name_key" ON "OllamaModel"("name");

-- Migrate data from Model to OllamaModel
INSERT INTO "OllamaModel" (
    "id",
    "name",
    "size",
    "digest",
    "format",
    "family",
    "parameters",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT 
    "id",
    "name",
    0, -- size (default)
    '', -- digest (default)
    'unknown', -- format (default)
    'unknown', -- family (default)
    "parameters",
    CASE 
        WHEN "status" = 'installed' THEN 'READY'
        WHEN "status" = 'not_installed' THEN 'NOT_DOWNLOADED'
        WHEN "status" = 'downloading' THEN 'DOWNLOADING'
        ELSE 'ERROR'
    END,
    "createdAt",
    "updatedAt"
FROM "Model";

-- Update MCPServer references
UPDATE "MCPServer"
SET "modelId" = (
    SELECT "id"
    FROM "OllamaModel"
    WHERE "OllamaModel"."id" = "MCPServer"."modelId"
);

-- Update ChatSession references
UPDATE "ChatSession"
SET "modelId" = (
    SELECT "id"
    FROM "OllamaModel"
    WHERE "OllamaModel"."id" = "ChatSession"."modelId"
);

-- Drop old tables
DROP TABLE "Model";
DROP TABLE "OllamaModelDetails"; 