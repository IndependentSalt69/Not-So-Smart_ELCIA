import { incidentService } from '../client/src/services/incidentService';

async function main() {
  console.log('=== VERIFYING PHASE 2 GET /api/v1/incidents/{incident_id} ===');

  console.log('\n--- 1. Fetching TEST-INC-001 by UUID (820d5447-eb9f-4264-9e66-995fd147d6a7) ---');
  const inc1 = await incidentService.getIncidentById('820d5447-eb9f-4264-9e66-995fd147d6a7');
  console.log('Result 1:', {
    id: inc1?.id,
    code: inc1?.code,
    type: inc1?.type,
    confidence: inc1?.confidence,
    severity: inc1?.severity,
    priority: inc1?.priority,
    status: inc1?.status,
    recommendedAction: inc1?.recommendedAction,
  });

  console.log('\n--- 2. Fetching TEST-INC-001 by tracking code ---');
  const inc2 = await incidentService.getIncidentById('TEST-INC-001');
  console.log('Result 2:', {
    id: inc2?.id,
    code: inc2?.code,
    type: inc2?.type,
    confidence: inc2?.confidence,
    severity: inc2?.severity,
    priority: inc2?.priority,
    status: inc2?.status,
  });

  console.log('\n--- 3. Fetching PG-SPATIAL-INC01 by tracking code ---');
  const inc3 = await incidentService.getIncidentById('PG-SPATIAL-INC01');
  console.log('Result 3:', {
    id: inc3?.id,
    code: inc3?.code,
    type: inc3?.type,
    confidence: inc3?.confidence,
    severity: inc3?.severity,
    priority: inc3?.priority,
    status: inc3?.status,
    coordinates: inc3?.coordinates,
  });

  console.log('\n--- 4. Fetching Nonexistent Incident (NONEXISTENT-99999) ---');
  const inc4 = await incidentService.getIncidentById('NONEXISTENT-99999');
  console.log('Result 4:', inc4 ? 'Found fallback' : 'Handled gracefully (undefined)');
}

main().catch(console.error);
