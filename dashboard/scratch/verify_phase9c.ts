import { analyticsService } from '../client/src/services/analyticsService';

async function verifyPhase9C() {
  console.log('--- Phase 9C Real Analytics Verification ---');

  try {
    // 1. Test getAnalyticsSummary()
    console.log('[1/3] Calling analyticsService.getAnalyticsSummary()...');
    const summary = await analyticsService.getAnalyticsSummary();
    console.log('✅ Analytics Summary retrieved successfully!');
    console.log('KPIs:', JSON.stringify(summary.kpis, null, 2));
    console.log('Status Distribution count:', summary.statusDistribution.length);
    console.log('Priority Distribution count:', summary.priorityDistribution.length);

    // 2. Test getAnalyticsTrends()
    console.log('\n[2/3] Calling analyticsService.getAnalyticsTrends(7)...');
    const trends = await analyticsService.getAnalyticsTrends(7);
    console.log('✅ Analytics Trends retrieved successfully!');
    console.log('Trends count:', trends.length);
    console.log('Sample trend point:', JSON.stringify(trends[0], null, 2));

    // 3. Test getAnalyticsZones()
    console.log('\n[3/3] Calling analyticsService.getAnalyticsZones()...');
    const zones = await analyticsService.getAnalyticsZones();
    console.log('✅ Analytics Zones retrieved successfully!');
    console.log('Zones count:', zones.length);
    if (zones.length > 0) {
      console.log('Sample zone metric:', JSON.stringify(zones[0], null, 2));
    }

    console.log('\n🎉 ALL PHASE 9C ANALYTICS SERVICE VERIFICATIONS PASSED!');
  } catch (err: any) {
    console.error('❌ Phase 9C Verification Failed:', err);
    process.exit(1);
  }
}

verifyPhase9C();
