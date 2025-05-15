-- CreateTable
CREATE TABLE "OllamaModelDetails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "size" BIGINT,
    "format" TEXT,
    "family" TEXT,
    "parameterSize" TEXT,
    "quantizationLevel" TEXT,
    "downloadProgress" REAL NOT NULL DEFAULT 0,
    "downloadStatus" TEXT NOT NULL DEFAULT 'idle',
    "errorMessage" TEXT,
    "digest" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OllamaModelDetails_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OllamaModelDetails_modelId_key" ON "OllamaModelDetails"("modelId");
