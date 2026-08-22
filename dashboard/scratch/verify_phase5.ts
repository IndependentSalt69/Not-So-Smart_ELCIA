import { incidentService } from '../client/src/services/incidentService';
import { api } from '../client/src/services/api';

async function main() {
  console.log('=== VERIFYING PHASE 5 INCIDENT ASSIGNMENTS ===');

  const testId = '820d5447-eb9f-4264-9e66-995fd147d6a7'; // TEST-INC-001 UUID

  console.log('\n--- 1. Fetching available system users (GET /api/v1/users/) ---');
  const users = await incidentService.getUsers();
  console.log('Users count:', users.length);
  console.log('Primary Operator User:', users[0]);

  if (users.length === 0) {
    throw new Error('No system users found!');
  }

  const userId = users[0].id;

  console.log('\n--- 2. Creating an assignment (POST /api/v1/incidents/{UUID}/assignments) ---');
  const newAssignment = await incidentService.createIncidentAssignment(testId, {
    assigned_to: userId,
    assigned_team: 'ELCIA Stormwater Maintenance Unit',
    notes: 'Deploy mobile de-watering pump unit',
  });
  console.log('Assignment Created Response:', newAssignment);

  console.log('\n--- 3. Fetching assignments list for incident (GET /api/v1/incidents/{UUID}/assignments) ---');
  const assignments = await incidentService.getIncidentAssignments(testId);
  console.log('Assignments count:', assignments.length);
  console.log('Latest assignment:', assignments[0]);

  console.log('\n--- 4. Testing error handling on invalid user UUID ---');
  try {
    await incidentService.createIncidentAssignment(testId, {
      assigned_to: '00000000-0000-0000-0000-000000000000',
      assigned_team: 'Test Team',
    });
    console.log('FAILED: Should have thrown ApiError for invalid user!');
  } catch (err: any) {
    console.log('SUCCESS: Caught expected error gracefully:', err.message || err);
  }
}

main().catch(console.error);
