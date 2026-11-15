-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "doubanUid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Selection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "selectionId" TEXT NOT NULL,
    "logicalKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerUid" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeYear" INTEGER,
    "topCategoryKey" TEXT,
    "topCategoryName" TEXT,
    "payloadJson" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Selection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SelectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "selectionId" TEXT NOT NULL,
    "awardId" TEXT,
    "awardName" TEXT,
    "awardKind" TEXT,
    "required" BOOLEAN,
    "topCategoryKey" TEXT,
    "entryType" TEXT NOT NULL,
    "rank" INTEGER,
    "movieId" TEXT NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "personName" TEXT,
    CONSTRAINT "SelectionItem_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Poster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pictureId" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "posterType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "thumbName" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Poster_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Like" (
    "userId" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "posterId"),
    CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Like_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Poster" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "posterType" TEXT,
    "visitorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_doubanUid_key" ON "User"("doubanUid");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Selection_selectionId_key" ON "Selection"("selectionId");

-- CreateIndex
CREATE INDEX "Selection_ownerId_logicalKey_uploadedAt_idx" ON "Selection"("ownerId", "logicalKey", "uploadedAt");

-- CreateIndex
CREATE INDEX "Selection_mode_scopeType_scopeYear_topCategoryKey_idx" ON "Selection"("mode", "scopeType", "scopeYear", "topCategoryKey");

-- CreateIndex
CREATE INDEX "SelectionItem_entryType_awardId_movieId_personName_idx" ON "SelectionItem"("entryType", "awardId", "movieId", "personName");

-- CreateIndex
CREATE INDEX "SelectionItem_entryType_topCategoryKey_movieId_personName_idx" ON "SelectionItem"("entryType", "topCategoryKey", "movieId", "personName");

-- CreateIndex
CREATE UNIQUE INDEX "Poster_pictureId_key" ON "Poster"("pictureId");

-- CreateIndex
CREATE UNIQUE INDEX "Poster_fileName_key" ON "Poster"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "Poster_thumbName_key" ON "Poster"("thumbName");

-- CreateIndex
CREATE INDEX "Poster_posterType_likeCount_uploadedAt_idx" ON "Poster"("posterType", "likeCount", "uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Poster_selectionId_posterType_key" ON "Poster"("selectionId", "posterType");

-- CreateIndex
CREATE INDEX "Like_posterId_idx" ON "Like"("posterId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteEvent_eventId_key" ON "SiteEvent"("eventId");

-- CreateIndex
CREATE INDEX "SiteEvent_eventType_posterType_idx" ON "SiteEvent"("eventType", "posterType");

-- CreateIndex
CREATE INDEX "SiteEvent_eventType_visitorId_idx" ON "SiteEvent"("eventType", "visitorId");
