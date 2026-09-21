import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    include: { _count: { select: { devices: true, patients: true } } }
  });
  console.log(JSON.stringify(orgs, null, 2));
}
main().finally(() => prisma.$disconnect());
