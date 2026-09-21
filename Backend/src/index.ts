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
  } catch (error) {
    console.error("[Setup] Failed to auto-assign sysadmin org:", error);
  }
});
