#!/bin/bash

# Ensure you replace "YOUR_DEVICE_ID_HERE" with a real Device ID from your dashboard
DEVICE_ID="YOUR_DEVICE_ID_HERE"

echo "Sending RED alert test telemetry for device: $DEVICE_ID..."

curl -X POST http://localhost:4000/api/ingest/telemetry \
  -H "Content-Type: application/json" \
  -H "x-mioconnect-key: replace-with-a-long-random-string" \
  -d '{
    "deviceId": "'"$DEVICE_ID"'",
    "modelNumber": "BP_MONITOR",
    "createdAt": '$(date +%s)',
    "bloodPressure": {
      "systolic": 180,
      "diastolic": 110
    }
  }'

echo -e "\n\nPayload sent! Check your frontend for the browser notification."
