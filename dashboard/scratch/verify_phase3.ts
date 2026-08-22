import { incidentService } from '../client/src/services/incidentService';
import { api } from '../client/src/services/api';

async function main() {
  console.log('=== VERIFYING PHASE 3 PATCH /api/v1/incidents/{incident_id}/status ===');

  const testId = '820d5447-eb9f-4264-9e66-995fd147d6a7'; // TEST-INC-001 UUID

  console.log('\n--- 1. Fetching current initial status of TEST-INC-001 ---');
  const initial = await incidentService.getIncidentById(testId);
  console.log('Initial Status:', initial?.status);

  console.log('\n--- 2. Mutating status of TEST-INC-001 to IN_PROGRESS ---');
  const updated = await incidentService.updateIncidentStatus(
    testId,
    'IN_PROGRESS',
    'Operations Control',
    'Field crew arrived on site and commenced de-watering.'
  );
  console.log('Updated Status from Backend Response:', updated.status);
  console.log('Updated ID:', updated.id);
  console.log('Updated Code:', updated.code);

  console.log('\n--- 3. Verifying status directly from backend database ---');
  const refetched = await incidentService.getIncidentById(testId);
  console.log('Refetched Status from Backend:', refetched?.status);

  console.log('\n--- 4. Checking backend status audit history endpoint ---');
  const history = await api.get<any[]>(`/incidents/${testId}/history`);
  console.log('Backend Audit History Entries Count:', history.length);
  console.log('Latest Audit Entry:', history[history.length - 1]);

  console.log('\n--- 5. Testing error handling on nonexistent incident ID ---');
  try {
    await incidentService.updateIncidentStatus('NONEXISTENT-99999', 'VERIFIED');
    console.log('FAILED: Should have thrown ApiError 404!');
  } catch (err: any) {
    console.log('SUCCESS: Caught expected error gracefully:', err.message || err);
  }
}

main().catch(console.error);
