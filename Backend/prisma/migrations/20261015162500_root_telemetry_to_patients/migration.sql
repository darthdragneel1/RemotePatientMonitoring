-- AlterTable: Add patientId, make deviceId nullable
ALTER TABLE "TelemetryEvent" ADD COLUMN "patientId" TEXT;
ALTER TABLE "TelemetryEvent" ALTER COLUMN "deviceId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "TelemetryEvent" DROP CONSTRAINT "TelemetryEvent_deviceId_fkey";

-- AddForeignKey with ON DELETE SET NULL for device
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey with ON DELETE CASCADE for patient
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "TelemetryEvent_patientId_recordedAt_idx" ON "TelemetryEvent"("patientId", "recordedAt");

-- Migrate existing telemetry events safely and losslessly:
-- Associate each historical event with the currently assigned patient of its device
UPDATE "TelemetryEvent" te
SET "patientId" = d."patientId"
FROM "Device" d
WHERE te."deviceId" = d.id AND d."patientId" IS NOT NULL;
