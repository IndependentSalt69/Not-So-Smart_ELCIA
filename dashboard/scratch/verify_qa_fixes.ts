import { incidentService } from '../client/src/services/incidentService';
import { api } from '../client/src/services/api';

async function verifyQaFixes() {
  console.log('=== VERIFYING DASHBOARD QA BUG FIXES ===\n');

  // 1. Verify getIncidents for 'all' types
  console.log('1. Testing getIncidents(all)...');
  const allIncidents = await incidentService.getIncidents({ type: 'all' });
  console.log(`✓ Fetched ${allIncidents.length} total incidents for 'all' types.`);
  allIncidents.forEach((inc) => console.log(`   - [${inc.id}] Type: ${inc.type}, Priority: ${inc.priority}, Zone: ${inc.zoneId}`));

  // 2. Verify getIncidents for 'waterlogging'
  console.log('\n2. Testing getIncidents(waterlogging)...');
  const waterIncidents = await incidentService.getIncidents({ type: 'waterlogging' });
  console.log(`✓ Fetched ${waterIncidents.length} waterlogging incidents.`);
  const allAreWater = waterIncidents.every((i) => i.type === 'waterlogging');
  if (!allAreWater) throw new Error('Filter leak: Non-waterlogging incident returned for waterlogging filter!');
  console.log('✓ All returned items match type === "waterlogging".');

  // 3. Verify getIncidents for 'pothole'
  console.log('\n3. Testing getIncidents(pothole)...');
  const potholeIncidents = await incidentService.getIncidents({ type: 'pothole' });
  console.log(`✓ Fetched ${potholeIncidents.length} pothole incidents.`);
  const allArePothole = potholeIncidents.every((i) => i.type === 'pothole');
  if (!allArePothole) throw new Error('Filter leak: Non-pothole incident returned for pothole filter!');
  console.log('✓ All returned items match type === "pothole".');

  // 4. Test Bug 2 Fix: Publish a new incident from Drone Ingestion via createIncident
  console.log('\n4. Testing Bug 2 Fix: Publishing incident via createIncident to backend POST /api/v1/incidents/...');
  const testIncident = {
    id: `QA-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    code: `QA-CODE-${Math.floor(1000 + Math.random() * 9000)}`,
    type: 'pothole' as const,
    confidence: 0.96,
    severity: 9.1,
    priority: 'P1' as const,
    timestamp: new Date().toISOString(),
    zone: 'Electronics City Zone (EC-01)',
    zoneId: 'EC-01',
    locationDescription: 'QA Test Pothole Corridor',
    coordinates: { lat: 12.8432, lng: 77.6621 },
    durationSeconds: 240,
    evidenceFrame: '',
    evidenceOverlay: '',
    severityFactors: {
      waterExtent: 0,
      persistenceSeconds: 240,
      roadObstruction: 9.1,
      roadCriticality: 9.5,
      explanation: ['QA Test Inspection'],
    },
    recommendedAction: 'Deploy Cold-Mix Bitumen Patching',
    status: 'DETECTED' as const,
    history: [],
  };

  const created = await incidentService.createIncident(testIncident);
  console.log(`✓ Incident created successfully! ID: ${created.id}, Backend Code: ${created.code}`);

  // 5. Verify created incident appears in backend queue refetch
  console.log('\n5. Verifying published incident exists in refetched backend queue...');
  const refetched = await incidentService.getIncidents({ type: 'all' });
  const found = refetched.find((i) => i.id === created.id || i.code === created.code);
  if (!found) throw new Error('Published incident not found in refetched queue!');
  console.log(`✓ Published incident '${found.id}' verified in live backend queue!`);

  console.log('\n=== ALL QA BUG FIX VERIFICATIONS PASSED SUCCESSFULLY! ===');
}

verifyQaFixes().catch((err) => {
  console.error('QA Verification Failed:', err);
  process.exit(1);
});
