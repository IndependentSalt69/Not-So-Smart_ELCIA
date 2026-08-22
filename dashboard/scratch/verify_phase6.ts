import { incidentService } from '../client/src/services/incidentService';

async function main() {
  console.log('=== VERIFYING PHASE 6 GET /api/v1/incidents/{incident_id}/detections ===');

  const testId = '820d5447-eb9f-4264-9e66-995fd147d6a7'; // TEST-INC-001 UUID
  const spatialId = '6ba7265f-0326-40dd-bcb2-699c7bf4398d'; // PG-SPATIAL-INC01 UUID

  console.log('\n--- 1. Fetching detection observations for TEST-INC-001 (UUID) ---');
  const det1 = await incidentService.getIncidentDetections(testId);
  console.log('Detections count:', det1.length);
  console.log('Primary Detection Details:', det1[0]);

  if (det1.length > 0) {
    console.log('Verified Detection Type:', det1[0].detectionType); // WATERLOGGING
    console.log('Verified Confidence:', det1[0].confidence); // 0.94
    console.log('Verified Frame Number:', det1[0].frameNumber); // 127
    console.log('Verified Location:', det1[0].location); // Point [77.6631, 12.8452]
  }

  console.log('\n--- 2. Fetching detections for PG-SPATIAL-INC01 (Empty State) ---');
  const det2 = await incidentService.getIncidentDetections(spatialId);
  console.log('Detections count (Empty expected):', det2.length);

  console.log('\n--- 3. Fetching detections for Nonexistent Incident (NONEXISTENT-99999) ---');
  const det3 = await incidentService.getIncidentDetections('NONEXISTENT-99999');
  console.log('Detections count (404 handled gracefully):', det3.length);
}

main().catch(console.error);
