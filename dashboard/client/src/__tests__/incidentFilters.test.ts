import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_MOCK_INCIDENTS } from '../data/mockIncidents';
import { incidentService } from '../services/incidentService';

describe('Incident Filtering Logic', () => {
  beforeEach(() => {
    process.env.VITE_USE_MOCK_DATA = 'true';
    incidentService.resetToMockData();
  });
  it('correctly filters by Type (waterlogging vs pothole)', async () => {
    const water = await incidentService.getIncidents({ type: 'waterlogging' });
    expect(water.length).toBeGreaterThan(0);
    expect(water.every((i) => i.type === 'waterlogging')).toBe(true);

    const potholes = await incidentService.getIncidents({ type: 'pothole' });
    expect(potholes.length).toBeGreaterThan(0);
    expect(potholes.every((i) => i.type === 'pothole')).toBe(true);
  });

  it('correctly filters by Priority (P1, P2, P3)', async () => {
    const p1List = await incidentService.getIncidents({ priority: 'P1' });
    expect(p1List.every((i) => i.priority === 'P1')).toBe(true);

    const p2List = await incidentService.getIncidents({ priority: 'P2' });
    expect(p2List.every((i) => i.priority === 'P2')).toBe(true);
  });

  it('correctly filters by Status', async () => {
    const detected = await incidentService.getIncidents({ status: 'DETECTED' });
    expect(detected.every((i) => i.status === 'DETECTED')).toBe(true);

    const closed = await incidentService.getIncidents({ status: 'CLOSED' });
    expect(closed.every((i) => i.status === 'CLOSED')).toBe(true);
  });

  it('correctly filters by ZoneId', async () => {
    const ec01 = await incidentService.getIncidents({ zoneId: 'EC-01' });
    expect(ec01.every((i) => i.zoneId === 'EC-01')).toBe(true);

    const ec03 = await incidentService.getIncidents({ zoneId: 'EC-03' });
    expect(ec03.every((i) => i.zoneId === 'EC-03')).toBe(true);
  });

  it('correctly searches text across ID and description', async () => {
    const searchById = await incidentService.getIncidents({ searchQuery: 'EC-0142' });
    expect(searchById.length).toBe(1);
    expect(searchById[0].id).toBe('EC-0142');

    const searchByWord = await incidentService.getIncidents({ searchQuery: 'Hosur' });
    expect(searchByWord.length).toBeGreaterThan(0);
    expect(
      searchByWord.every((i) =>
        i.locationDescription.toLowerCase().includes('hosur') ||
        i.zone.toLowerCase().includes('hosur')
      )
    ).toBe(true);
  });

  it('correctly handles multi-filter combinations', async () => {
    const combined = await incidentService.getIncidents({
      type: 'waterlogging',
      priority: 'P1',
      zoneId: 'EC-01',
    });
    expect(
      combined.every(
        (i) => i.type === 'waterlogging' && i.priority === 'P1' && i.zoneId === 'EC-01'
      )
    ).toBe(true);
  });
});
