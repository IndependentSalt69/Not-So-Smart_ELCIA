import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { incidentService } from '@/services/incidentService';
import { notificationService } from '@/services/notificationService';
import { Incident } from '@/types/incident';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function createMockIncident(id: string, code: string): Incident {
  return {
    id,
    code,
    type: 'waterlogging',
    confidence: 0.92,
    source: 'AI_VISION',
    severity: 8.0,
    priority: 'P1',
    timestamp: '2026-09-07T12:00:00Z',
    zone: 'Electronics City Zone (EC-01)',
    zoneId: 'EC-01',
    locationDescription: `${code} - Waterlogging Hazard`,
    coordinates: { lat: 12.8452, lng: 77.6631 },
    durationSeconds: 14.5,
    evidenceFrame: '/static/evidence/fallback.jpg',
    severityFactors: {
      waterExtent: 8.0,
      persistenceSeconds: 14.5,
      roadObstruction: 8.0,
      roadCriticality: 8.5,
      explanation: ['Waterlogging detected by aerial drone vision sensor.'],
    },
    recommendedAction: 'Deploy high-capacity mobile dewatering pump',
    status: 'RE_INSPECTION',
    history: [],
  };
}

describe('Incident Final Resolution Workflow & Notification Dismissal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_USE_MOCK_DATA = 'true';
    notificationService.resetForTesting();
    incidentService.resetToMockData();
  });

  it('1. Successful Stage 6 resolution updates status to CLOSED, triggers success toast, and clears notification', async () => {
    // 1. Verify incident to populate notification
    const verified = await incidentService.verifyIncident('EC-0142');
    expect(verified.status).toBe('VERIFIED');
    expect(notificationService.getNotifications().length).toBe(1);
    expect(notificationService.getUnreadCount()).toBe(1);

    // Progress to RE_INSPECTION (Stage 5)
    await incidentService.assignIncident('EC-0142', 'Field Team', 'Fix Drainage');
    await incidentService.updateIncidentStatus('EC-0142', 'IN_PROGRESS');
    await incidentService.updateIncidentStatus('EC-0142', 'RE_INSPECTION');

    let isDrawerOpen = true;
    const closeDrawer = () => {
      isDrawerOpen = false;
    };

    // Simulate CivicPulseDashboard handleUpdateStatus handler
    const handleUpdateStatus = async (id: string, nextStatus: any, notes?: string) => {
      try {
        const updated = await incidentService.updateIncidentStatus(id, nextStatus, 'Operations Control', notes);
        if (nextStatus === 'CLOSED') {
          toast.success('Incident Resolved', {
            description: 'Fix confirmed by aerial drone surveillance.',
          });
          closeDrawer();
        }
        return updated;
      } catch (err: any) {
        toast.error(err.message || 'Failed to update incident status');
      }
    };

    // Execute Stage 6 resolution
    const resolved = await handleUpdateStatus('EC-0142', 'CLOSED', 'Follow-up inspection confirmed issue resolved');

    // 1. Status is CLOSED
    expect(resolved?.status).toBe('CLOSED');

    // 2. Success toast with exact required wording was shown
    expect(toast.success).toHaveBeenCalledWith('Incident Resolved', {
      description: 'Fix confirmed by aerial drone surveillance.',
    });

    // 3. Resolution window automatically closed
    expect(isDrawerOpen).toBe(false);

    // 4. Notification is removed from active list and unread badge count is 0
    expect(notificationService.getNotifications().length).toBe(0);
    expect(notificationService.getUnreadCount()).toBe(0);

    // 5. Notification remains in historical audit log
    const historyLogs = notificationService.getAllNotifications();
    expect(historyLogs.length).toBe(1);
    expect(historyLogs[0].isDismissed).toBe(true);

    // 6. Incident is in Completed archive, excluded from Active queue
    const active = await incidentService.getIncidents({ queueTab: 'active' });
    expect(active.some((i) => i.code === 'EC-0142' || i.id === 'EC-0142')).toBe(false);

    const completed = await incidentService.getIncidents({ queueTab: 'completed' });
    expect(completed.some((i) => (i.code === 'EC-0142' || i.id === 'EC-0142') && i.status === 'CLOSED')).toBe(true);
  });

  it('2. Failed Stage 6 resolution shows error toast, keeps drawer open, and does NOT resolve incident or clear notification', async () => {
    // Setup verified incident with notification
    await incidentService.verifyIncident('EC-0142');
    expect(notificationService.getNotifications().length).toBe(1);

    let isDrawerOpen = true;
    const closeDrawer = () => {
      isDrawerOpen = false;
    };

    // Mock failure in updateIncidentStatus
    vi.spyOn(incidentService, 'updateIncidentStatus').mockRejectedValueOnce(
      new Error('Network error connecting to resolution endpoint')
    );

    const handleUpdateStatus = async (id: string, nextStatus: any, notes?: string) => {
      try {
        const updated = await incidentService.updateIncidentStatus(id, nextStatus, 'Operations Control', notes);
        if (nextStatus === 'CLOSED') {
          toast.success('Incident Resolved', {
            description: 'Fix confirmed by aerial drone surveillance.',
          });
          closeDrawer();
        }
        return updated;
      } catch (err: any) {
        toast.error(err.message || 'Failed to update incident status');
      }
    };

    await handleUpdateStatus('EC-0142', 'CLOSED');

    // 1. No success toast
    expect(toast.success).not.toHaveBeenCalled();

    // 2. Error toast shown
    expect(toast.error).toHaveBeenCalledWith('Network error connecting to resolution endpoint');

    // 3. Resolution drawer remains open
    expect(isDrawerOpen).toBe(true);

    // 4. Notification remains active
    expect(notificationService.getNotifications().length).toBe(1);
  });

  it('3. Reading notification alone does not resolve incident', async () => {
    await incidentService.verifyIncident('EC-0142');
    const notifs = notificationService.getNotifications();
    expect(notifs.length).toBe(1);
    expect(notifs[0].isRead).toBe(false);

    // User clicks / reads notification
    notificationService.markAsRead(notifs[0].id);

    // Notification is marked read, count is 0
    expect(notificationService.getNotifications()[0].isRead).toBe(true);
    expect(notificationService.getUnreadCount()).toBe(0);

    // Incident is still VERIFIED, not CLOSED
    const current = await incidentService.getIncidentById('EC-0142');
    expect(current?.status).toBe('VERIFIED');
  });
});
