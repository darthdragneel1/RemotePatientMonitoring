/// <reference types="node" />
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Matsumoto/\\1290", 10);
  const userPasswordHash = await bcrypt.hash("password123", 10);

  const orgA = await prisma.organization.upsert({
    where: { id: "seed-org-a" },
    update: {},
    create: { id: "seed-org-a", name: "Acme Health Clinic" },
  });
  
  const orgB = await prisma.organization.upsert({
    where: { id: "seed-org-b" },
    update: {},
    create: { id: "seed-org-b", name: "Riverside Medical Group" },
  });

  const adminOrg = await prisma.organization.upsert({
    where: { id: "seed-admin-org" },
    update: {},
    create: { id: "seed-admin-org", name: "System Admin Org" },
  });

  await prisma.user.upsert({
    where: { email: "abhishekkurra1999@gmail.com" },
    update: { orgId: adminOrg.id },
    create: {
      email: "abhishekkurra1999@gmail.com",
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      orgId: adminOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "user@acme.dev" },
    update: {},
    create: {
      email: "user@acme.dev",
      passwordHash: userPasswordHash,
      role: Role.ORG_USER,
      orgId: orgA.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "user@riverside.dev" },
    update: {},
    create: {
      email: "user@riverside.dev",
      passwordHash: userPasswordHash,
      role: Role.ORG_USER,
      orgId: orgB.id,
    },
  });

  const patientA1 = await prisma.patient.upsert({
    where: { orgId_mrn: { orgId: orgA.id, mrn: "MRN-A-001" } },
    update: {},
    create: {
      orgId: orgA.id,
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: new Date("1965-03-12"),
      gender: "male",
      mrn: "MRN-A-001",
      phone: "555-0101",
    },
  });

  const patientA2 = await prisma.patient.upsert({
    where: { orgId_mrn: { orgId: orgA.id, mrn: "MRN-A-002" } },
    update: {},
    create: {
      orgId: orgA.id,
      firstName: "Jane",
      lastName: "Smith",
      dateOfBirth: new Date("1978-07-22"),
      gender: "female",
      mrn: "MRN-A-002",
      phone: "555-0102",
    },
  });

  const patientB1 = await prisma.patient.upsert({
    where: { orgId_mrn: { orgId: orgB.id, mrn: "MRN-B-001" } },
    update: {},
    create: {
      orgId: orgB.id,
      firstName: "Robert",
      lastName: "Johnson",
      dateOfBirth: new Date("1955-11-05"),
      gender: "male",
      mrn: "MRN-B-001",
      phone: "555-0201",
    },
  });

  await prisma.device.upsert({
    where: { deviceId: "100224300182" },
    update: {},
    create: {
      deviceId: "100224300182",
      modelNumber: "TMB-2092-G",
      imei: "867420043349754",
      sn: "100224300182",
      orgId: orgA.id,
      patientId: patientA1.id,
    },
  });

  await prisma.device.upsert({
    where: { deviceId: "112233445566" },
    update: {},
    create: {
      deviceId: "112233445566",
      modelNumber: "GBS-2104-G",
      imei: "864475041535658",
      sn: "112233445566",
      orgId: orgA.id,
      patientId: patientA2.id,
    },
  });

  await prisma.device.upsert({
    where: { deviceId: "351358819062347" },
    update: {},
    create: {
      deviceId: "351358819062347",
      modelNumber: "BM1000",
      imei: "351358819062347",
      sn: "351358819062347",
      orgId: orgB.id,
      patientId: patientB1.id,
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
