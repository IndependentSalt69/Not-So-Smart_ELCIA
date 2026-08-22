import { incidentService } from '../client/src/services/incidentService';

async function main() {
  console.log('=== VERIFYING PHASE 4 GET /api/v1/incidents/{incident_id}/evidence ===');

  const testId = '820d5447-eb9f-4264-9e66-995fd147d6a7'; // TEST-INC-001 UUID
  const spatialId = '6ba7265f-0326-40dd-bcb2-699c7bf4398d'; // PG-SPATIAL-INC01 UUID

  console.log('\n--- 1. Fetching evidence for TEST-INC-001 (UUID) ---');
  const ev1 = await incidentService.getIncidentEvidence(testId);
  console.log('Evidence Count:', ev1.length);
  console.log('Primary Asset Details:', ev1[0]);

  console.log('\n--- 2. Fetching evidence for PG-SPATIAL-INC01 (Empty State) ---');
  const ev2 = await incidentService.getIncidentEvidence(spatialId);
  console.log('Evidence Count (Empty expected):', ev2.length);

  console.log('\n--- 3. Fetching evidence for Nonexistent Incident (NONEXISTENT-99999) ---');
  const ev3 = await incidentService.getIncidentEvidence('NONEXISTENT-99999');
  console.log('Evidence Count (404 handled gracefully):', ev3.length);
}

main().catch(console.error);
