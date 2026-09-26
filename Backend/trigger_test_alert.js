const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function trigger() {
  const device = await prisma.device.findFirst({
    include: { patient: true }
  });
  
  if (!device) {
    console.log("No devices found in DB!");
    return;
  }
  
  console.log("Found device:", device.deviceId, "for patient:", device.patient?.firstName);
  
  const payload = {
    deviceId: device.deviceId,
    modelNumber: device.modelNumber || "TEST_MODEL",
    createdAt: Math.floor(Date.now() / 1000),
    bloodPressure: {
      systolic: 180, // High enough to trigger RED usually
      diastolic: 110
    },
    heartRate: 115
  };
  
  console.log("Sending payload...");
  const res = await fetch("http://localhost:4000/api/ingest/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mioconnect-key": process.env.INGEST_API_KEY_VALUE || "replace-with-a-long-random-string"
    },
    body: JSON.stringify(payload)
  });
  
  console.log("Response:", res.status, await res.text());
}

trigger().catch(console.error).finally(() => prisma.$disconnect());
