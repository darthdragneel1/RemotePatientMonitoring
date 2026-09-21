/// <reference types="node" />
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Matsumoto/\\1290", 10);

  // Clean up old seeded orgs if they exist (by name)
  const orgsToDelete = ["Acme Health Clinic", "Riverside Medical Group", "System Admin Org"];
  
  for (const name of orgsToDelete) {
    const org = await prisma.organization.findFirst({ where: { name } });
    if (org) {
      await prisma.telemetryEvent.deleteMany({ where: { device: { orgId: org.id } } });
      await prisma.device.deleteMany({ where: { orgId: org.id } });
      await prisma.patient.deleteMany({ where: { orgId: org.id } });
      await prisma.invite.deleteMany({ where: { orgId: org.id } });
      await prisma.user.deleteMany({ where: { orgId: org.id, id: { not: "super-admin" } } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
  }

  // Create or update the SUPER_ADMIN user without any organization
  await prisma.user.upsert({
    where: { email: "abhishekkurra1999@gmail.com" },
    update: { orgId: null },
    create: {
      email: "abhishekkurra1999@gmail.com",
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      orgId: null,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
