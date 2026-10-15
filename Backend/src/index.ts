import "dotenv/config";
import { app } from "./app";
import { prisma } from "./db/prisma";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, async () => {
  console.log(`Server listening on http://localhost:${port}`);

  try {
    const sysAdminEmail = "abhishekkurra1999@gmail.com";
    const sysAdmin = await prisma.user.findUnique({ where: { email: sysAdminEmail } });
    
    if (sysAdmin && !sysAdmin.orgId) {
      let adminOrg = await prisma.organization.findFirst({ where: { name: "System Admin Org" } });
      if (!adminOrg) {
        adminOrg = await prisma.organization.create({ data: { name: "System Admin Org" } });
      }
      
      await prisma.user.update({
        where: { id: sysAdmin.id },
        data: { orgId: adminOrg.id }
      });
      console.log(`[Setup] Assigned ${sysAdminEmail} to System Admin Org.`);
    }

    // Safely and losslessly link all historical telemetry from assigned devices to their patients
    try {
      const migrated = await prisma.$executeRawUnsafe(`
        UPDATE "TelemetryEvent" te
        SET "patientId" = d."patientId"
        FROM "Device" d
        WHERE te."deviceId" = d.id 
          AND te."patientId" IS NULL 
          AND d."patientId" IS NOT NULL;
      `);
      if (typeof migrated === "number" && migrated > 0) {
        console.log(`[Migration] Safely linked ${migrated} historical telemetry events from devices to assigned patients.`);
      }
    } catch (migErr) {
      console.warn("[Migration] Telemetry patient link check:", migErr);
    }
  } catch (error) {
    console.error("[Setup] Failed to auto-assign sysadmin org:", error);
  }
});
