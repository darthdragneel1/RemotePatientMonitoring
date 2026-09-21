-- DropForeignKey
ALTER TABLE "TelemetryEvent" DROP CONSTRAINT "TelemetryEvent_deviceId_fkey";

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
