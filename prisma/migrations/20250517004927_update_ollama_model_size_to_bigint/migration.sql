/*
  Warnings:

  - You are about to alter the column `size` on the `OllamaModel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "error" TEXT
);
INSERT INTO "new_OllamaModel" ("createdAt", "digest", "downloadProgress", "error", "family", "format", "id", "isDownloaded", "name", "parameters", "size", "status", "updatedAt") SELECT "createdAt", "digest", "downloadProgress", "error", "family", "format", "id", "isDownloaded", "name", "parameters", "size", "status", "updatedAt" FROM "OllamaModel";
DROP TABLE "OllamaModel";
ALTER TABLE "new_OllamaModel" RENAME TO "OllamaModel";
CREATE UNIQUE INDEX "OllamaModel_name_key" ON "OllamaModel"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
