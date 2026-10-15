CREATE TABLE "PersonRelationship" (
    "personId" TEXT NOT NULL,
    "relatedPersonId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Related',
    "createdAt" INTEGER NOT NULL,
    PRIMARY KEY ("personId", "relatedPersonId"),
    CONSTRAINT "PersonRelationship_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonRelationship_relatedPersonId_fkey" FOREIGN KEY ("relatedPersonId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PersonRelationship_relatedPersonId_idx" ON "PersonRelationship"("relatedPersonId");
