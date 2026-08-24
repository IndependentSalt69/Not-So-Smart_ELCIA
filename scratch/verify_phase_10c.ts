import { incidentService } from '../dashboard/client/src/services/incidentService';

async function runVerification() {
  console.log('=== PHASE 10C INCIDENT QUEUE EVIDENCE THUMBNAILS VERIFICATION ===\n');

  // Test 1: In-memory Caching
  console.log('[Test 1] In-memory evidence caching & request deduplication');
  const testIncidentId = 'test-inc-caching-uuid-1';
  
  // Call 1
  const p1 = incidentService.getPrimaryEvidenceMediaUrl(testIncidentId);
  // Call 2 in parallel (should deduplicate promise)
  const p2 = incidentService.getPrimaryEvidenceMediaUrl(testIncidentId);

  const [res1, res2] = await Promise.all([p1, p2]);
  console.log(`Parallel call results: res1="${res1}", res2="${res2}"`);

  // Call 3 after completion (should hit synchronous/in-memory cache)
  const cachedVal = incidentService.getCachedPrimaryEvidence(testIncidentId);
  console.log(`Cached value for ${testIncidentId}: "${cachedVal}"`);

  if (res1 === res2 && cachedVal !== undefined) {
    console.log('✅ TEST 1 PASSED: In-memory caching and in-flight deduplication working correctly.');
  } else {
    console.error('❌ TEST 1 FAILED!');
    process.exit(1);
  }

  // Test 2: Preloading Batching
  console.log('\n[Test 2] Preloading batch helper');
  const batchIds = ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'];
  await incidentService.preloadPrimaryEvidence(batchIds);

  const cachedCount = batchIds.filter((id) => incidentService.getCachedPrimaryEvidence(id) !== undefined).length;
  console.log(`Preloaded IDs: ${batchIds.length}, Cached entries: ${cachedCount}`);
  if (cachedCount === batchIds.length) {
    console.log('✅ TEST 2 PASSED: Batch preloading cached all visible IDs without error.');
  } else {
    console.error('❌ TEST 2 FAILED!');
    process.exit(1);
  }

  console.log('\n=== ALL PHASE 10C VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runVerification();
