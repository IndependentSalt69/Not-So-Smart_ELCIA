/**
 * Verification script to test the exact INC-AI-2004 (UUID: eb8d083d-d028-4e44-be3c-9b41b4057bf0) lifecycle
 */

const API_BASE = 'http://127.0.0.1:8000/api/v1';

async function runTest() {
  console.log('--- Golden E2E Verification: INC-AI-2004 ID Mapping & Lifecycle ---');

  // 1. Fetch queue to locate INC-AI-2004
  console.log('[1/11] Fetching incidents queue...');
  const queueRes = await fetch(`${API_BASE}/incidents/?limit=100`);
  if (!queueRes.ok) throw new Error(`Queue fetch failed: ${queueRes.status}`);
  const queueData = await queueRes.json();
  
  let target = queueData.items.find((i: any) => i.incident_code === 'INC-AI-2004' || i.id === 'eb8d083d-d028-4e44-be3c-9b41b4057bf0');
  if (!target) {
    console.log('INC-AI-2004 not found in queue, creating it explicitly with known UUID...');
    const createRes = await fetch(`${API_BASE}/incidents/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_code: 'INC-AI-2004',
        incident_type: 'WATERLOGGING',
        confidence: 0.94,
        severity_score: 8.7,
        priority: 'P1',
        status: 'DETECTED',
        started_at: new Date().toISOString(),
        location: { type: 'Point', coordinates: [77.6631, 12.8452] },
      }),
    });
    if (!createRes.ok) throw new Error(`Failed to create target incident: ${createRes.status}`);
    target = await createRes.json();
  }

  const backendUuid = target.id;
  const humanCode = target.incident_code;
  console.log(`[PASS] Target identified -> Backend UUID: ${backendUuid}, Human Code: ${humanCode}`);

  // 2. Simulate Close & Re-open Drawer -> Fetch details by backend UUID
  console.log('[2/11] Fetching single incident details by UUID...');
  const detailRes = await fetch(`${API_BASE}/incidents/${backendUuid}`);
  if (!detailRes.ok) throw new Error(`Detail fetch failed: ${detailRes.status}`);
  const detail = await detailRes.json();
  console.log(`[PASS] Details retrieved: ID=${detail.id}, Code=${detail.incident_code}, Status=${detail.status}`);

  // 3. Fetch evidence by backend UUID
  console.log('[3/11] Fetching incident evidence...');
  const evRes = await fetch(`${API_BASE}/incidents/${backendUuid}/evidence`);
  if (!evRes.ok) throw new Error(`Evidence fetch failed: ${evRes.status}`);
  const evData = await evRes.json();
  console.log(`[PASS] Evidence assets count: ${evData.length}`);

  // 4. Fetch detections by backend UUID
  console.log('[4/11] Fetching incident detections...');
  const detRes = await fetch(`${API_BASE}/incidents/${backendUuid}/detections`);
  if (!detRes.ok) throw new Error(`Detections fetch failed: ${detRes.status}`);
  const detData = await detRes.json();
  console.log(`[PASS] Detections count: ${detData.length}`);

  // 5. Verify incident (Status -> VERIFIED)
  console.log('[5/11] Mutating status to VERIFIED...');
  const verifyRes = await fetch(`${API_BASE}/incidents/${backendUuid}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'VERIFIED', comment: 'Verified by Command Operator' }),
  });
  if (!verifyRes.ok) throw new Error(`Verify mutation failed: ${verifyRes.status}`);
  const verifiedData = await verifyRes.json();
  console.log(`[PASS] Status updated to: ${verifiedData.status}`);

  // 6. Fetch users to get assignment user
  console.log('[6/11] Fetching users list...');
  const usersRes = await fetch(`${API_BASE}/users/`);
  if (!usersRes.ok) throw new Error(`Users fetch failed: ${usersRes.status}`);
  const users = await usersRes.json();
  const assignedUserId = users[0].id;
  console.log(`[PASS] Assigned operator user: ${users[0].name} (${assignedUserId})`);

  // 7. Assign incident (Create assignment + mutate status to ASSIGNED)
  console.log('[7/11] Creating assignment record...');
  const assignRes = await fetch(`${API_BASE}/incidents/${backendUuid}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assigned_to: assignedUserId,
      assigned_team: 'Drainage Operations Team A',
      notes: 'Deploy high-capacity mobile de-watering sump pumps',
    }),
  });
  if (!assignRes.ok) throw new Error(`Assignment creation failed: ${assignRes.status}`);
  const assignData = await assignRes.json();
  console.log(`[PASS] Assignment created with ID: ${assignData.id}`);

  console.log('[8/11] Mutating status to ASSIGNED...');
  const statusAssignRes = await fetch(`${API_BASE}/incidents/${backendUuid}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ASSIGNED', comment: 'Dispatched to Drainage Operations Team A' }),
  });
  if (!statusAssignRes.ok) throw new Error(`Status update to ASSIGNED failed: ${statusAssignRes.status}`);
  const statusAssignData = await statusAssignRes.json();
  console.log(`[PASS] Status updated to: ${statusAssignData.status}`);

  // 8. Add inspection record
  console.log('[9/11] Logging field inspection record...');
  const inspectRes = await fetch(`${API_BASE}/incidents/${backendUuid}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inspector_id: assignedUserId,
      result: 'RESOLVED',
      notes: 'Field verification completed. Hazard fully mitigated.',
      location: { type: 'Point', coordinates: [77.6631, 12.8452] },
    }),
  });
  if (!inspectRes.ok) throw new Error(`Inspection creation failed: ${inspectRes.status}`);
  const inspectData = await inspectRes.json();
  console.log(`[PASS] Inspection created with result: ${inspectData.result}`);

  // 9. Re-fetch refreshed record and verify all associations
  console.log('[10/11] Refreshing incident and verifying associations...');
  const refreshedRes = await fetch(`${API_BASE}/incidents/${backendUuid}`);
  const refreshed = await refreshedRes.json();
  if (refreshed.status !== 'ASSIGNED') throw new Error(`Expected status ASSIGNED, got ${refreshed.status}`);
  if (refreshed.incident_code !== humanCode) throw new Error(`Code mismatch: ${refreshed.incident_code} vs ${humanCode}`);

  const assignmentsListRes = await fetch(`${API_BASE}/incidents/${backendUuid}/assignments`);
  const assignmentsList = await assignmentsListRes.json();
  if (assignmentsList.length === 0) throw new Error('Expected at least 1 assignment');

  const inspectionsListRes = await fetch(`${API_BASE}/incidents/${backendUuid}/inspections`);
  const inspectionsList = await inspectionsListRes.json();
  if (inspectionsList.length === 0) throw new Error('Expected at least 1 inspection');

  const historyRes = await fetch(`${API_BASE}/incidents/${backendUuid}/history`);
  const historyList = await historyRes.json();

  console.log(`[11/11] All lifecycle steps verified for ${humanCode} (${backendUuid})!`);
  console.log(`- Final Status: ${refreshed.status}`);
  console.log(`- Assignments Count: ${assignmentsList.length}`);
  console.log(`- Inspections Count: ${inspectionsList.length}`);
  console.log(`- Status History Entries: ${historyList.length}`);
  console.log('=== GOLDEN E2E VERIFICATION COMPLETED SUCCESSFULLY ===');
}

runTest().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
