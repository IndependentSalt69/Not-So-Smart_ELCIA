import { incidentService } from '../client/src/services/incidentService';

async function main() {
  console.log('=== VERIFYING PHASE 7 FIELD INSPECTIONS ===');

  const testId = '820d5447-eb9f-4264-9e66-995fd147d6a7'; // TEST-INC-001 UUID

  console.log('\n--- 1. Fetching available system users (GET /api/v1/users/) ---');
  const users = await incidentService.getUsers();
  console.log('Users count:', users.length);
  console.log('Primary Inspector User:', users[0]);

  if (users.length === 0) {
    throw new Error('No system users found!');
  }

  const inspectorId = users[0].id;

  console.log('\n--- 2. Fetching existing inspections (GET /api/v1/incidents/{UUID}/inspections) ---');
  const initialInspections = await incidentService.getIncidentInspections(testId);
  console.log('Existing Inspections Count:', initialInspections.length);
  if (initialInspections.length > 0) {
    console.log('Primary Inspection Details:', initialInspections[0]);
  }

  console.log('\n--- 3. Creating a RESOLVED inspection (POST /api/v1/incidents/{UUID}/inspections) ---');
  const inspResolved = await incidentService.createIncidentInspection(testId, {
    inspector_id: inspectorId,
    result: 'RESOLVED',
    notes: 'Phase 7 Integration Test — Road clear and de-watered.',
    location: {
      type: 'Point',
      coordinates: [77.6631, 12.8452],
    },
  });
  console.log('Created RESOLVED Inspection Response:', inspResolved);

  console.log('\n--- 4. Creating a PARTIALLY_RESOLVED inspection ---');
  const inspPartial = await incidentService.createIncidentInspection(testId, {
    inspector_id: inspectorId,
    result: 'PARTIALLY_RESOLVED',
    notes: 'Phase 7 Integration Test — Water level reduced, secondary drainage desilting ongoing.',
  });
  console.log('Created PARTIALLY_RESOLVED Inspection Result:', inspPartial.result);

  console.log('\n--- 5. Creating a NOT_RESOLVED inspection ---');
  const inspNotResolved = await incidentService.createIncidentInspection(testId, {
    inspector_id: inspectorId,
    result: 'NOT_RESOLVED',
    notes: 'Phase 7 Integration Test — Recurrent inflow detected, pump unit re-dispatch required.',
  });
  console.log('Created NOT_RESOLVED Inspection Result:', inspNotResolved.result);

  console.log('\n--- 6. Verifying updated inspections list ---');
  const updatedInspections = await incidentService.getIncidentInspections(testId);
  console.log('Updated Inspections Count:', updatedInspections.length);
  console.log('Latest Inspection:', updatedInspections[0]);

  console.log('\n--- 7. Testing error handling on invalid inspector UUID ---');
  try {
    await incidentService.createIncidentInspection(testId, {
      inspector_id: '00000000-0000-0000-0000-000000000000',
      result: 'RESOLVED',
    });
    console.log('FAILED: Should have thrown ApiError for invalid inspector!');
  } catch (err: any) {
    console.log('SUCCESS: Caught expected error gracefully:', err.message || err);
  }

  console.log('\n--- 8. Testing error handling on invalid evidence UUID ---');
  try {
    await incidentService.createIncidentInspection(testId, {
      inspector_id: inspectorId,
      result: 'RESOLVED',
      evidence_id: '00000000-0000-0000-0000-000000000000',
    });
    console.log('FAILED: Should have thrown ApiError for invalid evidence!');
  } catch (err: any) {
    console.log('SUCCESS: Caught expected error gracefully:', err.message || err);
  }

  console.log('\n--- 9. Testing error handling on nonexistent incident ID ---');
  try {
    await incidentService.getIncidentInspections('NONEXISTENT-99999');
    console.log('SUCCESS: Nonexistent incident handled gracefully without throwing crash.');
  } catch (err: any) {
    console.log('Handled:', err.message || err);
  }
}

main().catch(console.error);
