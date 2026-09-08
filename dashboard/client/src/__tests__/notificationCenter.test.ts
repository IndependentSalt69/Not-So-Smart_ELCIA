import { beforeEach, describe, expect, it } from 'vitest';
import { incidentService } from '../services/incidentService';
import { notificationService } from '../services/notificationService';
import { getIncidentTypeLabel, Incident, IncidentType } from '../types/incident';

describe('Notification Center - Operations Verification & Dispatch', () => {
  beforeEach(() => {
    process.env.VITE_USE_MOCK_DATA = 'true';
    notificationService.resetForTesting();
    incidentService.resetToMockData();
  });

  // 1. Verification of an incident creates a notification
  it('1. creates a notification when an incident is verified', async () => {
    expect(notificationService.getNotifications().length).toBe(0);
    expect(notificationService.getUnreadCount()).toBe(0);

    const verified = await incidentService.verifyIncident(
      'EC-0142',
      'Operations Commander',
      'Confirmed road inundation'
    );

    const notifications = notificationService.getNotifications();
    expect(notifications.length).toBe(1);
    expect(notifications[0].incidentId).toBe(verified.id);
  });

  // 2. Notification includes the correct incident code
  it('2. notification includes the correct incident code', async () => {
    const verified = await incidentService.verifyIncident('EC-0142');
    const notif = notificationService.getNotifications()[0];

    expect(notif.incidentCode).toBe(verified.code || verified.id);
    expect(notif.incidentCode).toBe('EC-0142');
  });

  // 3. Notification includes correct incident type
  it('3. notification includes the correct incident type', async () => {
    const incident = await incidentService.getIncidentById('EC-0142');
    expect(incident).toBeDefined();

    await incidentService.verifyIncident('EC-0142');
    const notif = notificationService.getNotifications()[0];

    expect(notif.incidentType).toBe(incident!.type);
    expect(notif.incidentType).toBe('waterlogging');
  });

  // 4. Notification includes priority
  it('4. notification includes the priority level', async () => {
    const incident = await incidentService.getIncidentById('EC-0142');
    expect(incident).toBeDefined();

    await incidentService.verifyIncident('EC-0142');
    const notif = notificationService.getNotifications()[0];

    expect(notif.priority).toBe(incident!.priority);
    expect(notif.priority).toBe('P1');
  });

  // 5. Notification starts unread
  it('5. notification starts in unread state with unreadCount = 1', async () => {
    await incidentService.verifyIncident('EC-0142');
    const notif = notificationService.getNotifications()[0];

    expect(notif.isRead).toBe(false);
    expect(notificationService.getUnreadCount()).toBe(1);
  });

  // 6. Clicking notification marks it read
  it('6. marking notification as read updates isRead to true and decrements unreadCount', async () => {
    await incidentService.verifyIncident('EC-0142');
    const notif = notificationService.getNotifications()[0];
    expect(notif.isRead).toBe(false);
    expect(notificationService.getUnreadCount()).toBe(1);

    notificationService.markAsRead(notif.id);

    const updatedNotifications = notificationService.getNotifications();
    expect(updatedNotifications[0].isRead).toBe(true);
    expect(notificationService.getUnreadCount()).toBe(0);
  });

  // 7. Clicking notification opens the correct incident
  it('7. notification references the exact incident record without duplicates', async () => {
    const original = await incidentService.getIncidentById('EC-0142');
    await incidentService.verifyIncident('EC-0142');
    const notif = notificationService.getNotifications()[0];

    const targetIncident = await incidentService.getIncidentById(notif.incidentId);
    expect(targetIncident).toBeDefined();
    expect(targetIncident?.id).toBe(original?.id);
    expect(targetIncident?.code).toBe(original?.code);
    expect(targetIncident?.status).toBe('VERIFIED');
  });

  // 8. Multiple verified incidents create multiple notifications
  it('8. multiple verified incidents create multiple notifications ordered newest first', async () => {
    await incidentService.verifyIncident('EC-0142');
    await incidentService.verifyIncident('EC-0160');
    await incidentService.verifyIncident('EC-0170');

    const notifications = notificationService.getNotifications();
    expect(notifications.length).toBe(3);
    expect(notificationService.getUnreadCount()).toBe(3);

    // Order should be newest first
    expect(notifications[0].incidentId).toBe('EC-0170');
    expect(notifications[1].incidentId).toBe('EC-0160');
    expect(notifications[2].incidentId).toBe('EC-0142');

    // Mark all as read
    notificationService.markAllAsRead();
    expect(notificationService.getUnreadCount()).toBe(0);
    expect(notificationService.getNotifications().every((n) => n.isRead)).toBe(true);
  });

  // 9. Existing five hazard types remain supported
  it('9. supports all 5 hazard classes (damaged_footpath, drainage_overflow, open_manhole, pothole, waterlogging)', async () => {
    const hazardTypes: IncidentType[] = [
      'damaged_footpath',
      'drainage_overflow',
      'open_manhole',
      'pothole',
      'waterlogging',
    ];

    for (const type of hazardTypes) {
      const mockIncident: Incident = {
        id: `test-id-${type}`,
        code: `INC-TEST-${type.toUpperCase()}`,
        type,
        confidence: 0.95,
        severity: 8.0,
        priority: 'P1',
        timestamp: new Date().toISOString(),
        zone: 'Electronics City Phase 1',
        zoneId: 'EC-01',
        locationDescription: `Test corridor for ${getIncidentTypeLabel(type)}`,
        coordinates: { lat: 12.8452, lng: 77.6631 },
        durationSeconds: 120,
        evidenceFrame: '',
        evidenceOverlay: '',
        severityFactors: {
          waterExtent: 5,
          persistenceSeconds: 120,
          roadObstruction: 8,
          roadCriticality: 8,
          explanation: ['Test hazard detection'],
        },
        recommendedAction: 'Dispatch repair crew',
        status: 'DETECTED',
        history: [],
      };

      // Add verified notification for each hazard type
      const notif = notificationService.addVerifiedNotification(
        mockIncident,
        'Auto Inspector',
        `Verified ${type}`
      );

      expect(notif.incidentType).toBe(type);
      expect(notif.incidentCode).toBe(`INC-TEST-${type.toUpperCase()}`);
      expect(notif.isRead).toBe(false);
      expect(getIncidentTypeLabel(notif.incidentType)).toBeDefined();
    }

    const allNotifs = notificationService.getNotifications();
    expect(allNotifs.length).toBe(5);

    // Verify open_manhole in particular does not fall back to pothole
    const manholeNotif = allNotifs.find((n) => n.incidentType === 'open_manhole');
    expect(manholeNotif).toBeDefined();
    expect(manholeNotif?.incidentType).toBe('open_manhole');
    expect(getIncidentTypeLabel(manholeNotif!.incidentType)).toBe('Open Manhole');
  });

  // 10. No notification is created for mere DETECTED state
  it('10. no notification is created for raw AI detection in DETECTED state', async () => {
    const rawIncident: Incident = {
      id: 'test-raw-detected',
      code: 'INC-RAW-01',
      type: 'pothole',
      confidence: 0.88,
      severity: 6.5,
      priority: 'P2',
      timestamp: new Date().toISOString(),
      zone: 'Electronics City Phase 1',
      zoneId: 'EC-01',
      locationDescription: 'Raw detection from drone stream',
      coordinates: { lat: 12.8452, lng: 77.6631 },
      durationSeconds: 60,
      evidenceFrame: '',
      evidenceOverlay: '',
      severityFactors: {
        waterExtent: 0,
        persistenceSeconds: 60,
        roadObstruction: 6,
        roadCriticality: 6,
        explanation: ['Raw detection'],
      },
      recommendedAction: 'Inspect and patch',
      status: 'DETECTED',
      history: [],
    };

    // Creating a raw incident in DETECTED status
    await incidentService.createIncident(rawIncident);

    // Verification: NO notifications should have been generated
    expect(notificationService.getNotifications().length).toBe(0);
    expect(notificationService.getUnreadCount()).toBe(0);
  });

  // 11. READ ≠ RESOLVED: Reading a notification marks it read without changing incident status
  it('11. opening/reading a notification marks it read but does NOT resolve or modify incident status', async () => {
    const verified = await incidentService.verifyIncident('EC-0142');
    expect(verified.status).toBe('VERIFIED');

    const notifs = notificationService.getNotifications();
    expect(notifs.length).toBe(1);
    expect(notifs[0].isRead).toBe(false);

    // Mark as read
    notificationService.markAsRead(notifs[0].id);

    // Notification is now read
    expect(notificationService.getNotifications()[0].isRead).toBe(true);
    expect(notificationService.getUnreadCount()).toBe(0);

    // Incident status MUST still be VERIFIED (not resolved or altered)
    const incidentAfterRead = await incidentService.getIncidentById('EC-0142');
    expect(incidentAfterRead?.status).toBe('VERIFIED');
  });

  // 12. Resolving incident removes notification from active list and updates unread count
  it('12. resolving an incident to CLOSED automatically clears/dismisses active notification', async () => {
    await incidentService.verifyIncident('EC-0142');
    await incidentService.assignIncident('EC-0142', 'Drainage Crew', 'Clear blockage');
    await incidentService.updateIncidentStatus('EC-0142', 'IN_PROGRESS');
    await incidentService.updateIncidentStatus('EC-0142', 'RE_INSPECTION');

    expect(notificationService.getNotifications().length).toBe(1);
    expect(notificationService.getUnreadCount()).toBe(1);

    // Advance Stage 6: Mark as Resolved (CLOSED)
    const resolved = await incidentService.updateIncidentStatus('EC-0142', 'CLOSED');
    expect(resolved.status).toBe('CLOSED');

    // Active notifications and badge count are automatically cleared
    expect(notificationService.getNotifications().length).toBe(0);
    expect(notificationService.getUnreadCount()).toBe(0);
  });

  // 13. Historical notification data is preserved after resolution
  it('13. historical notification records are preserved in getAllNotifications() after resolution for audit', async () => {
    await incidentService.verifyIncident('EC-0142');
    expect(notificationService.getNotifications().length).toBe(1);

    await incidentService.assignIncident('EC-0142', 'Crew', 'Action');
    await incidentService.updateIncidentStatus('EC-0142', 'IN_PROGRESS');
    await incidentService.updateIncidentStatus('EC-0142', 'RE_INSPECTION');
    await incidentService.updateIncidentStatus('EC-0142', 'CLOSED');

    // Active list is empty
    expect(notificationService.getNotifications().length).toBe(0);

    // Full historical audit log retains the record marked as isDismissed
    const allRecords = notificationService.getAllNotifications();
    expect(allRecords.length).toBe(1);
    expect(allRecords[0].incidentCode).toBe('EC-0142');
    expect(allRecords[0].isDismissed).toBe(true);
  });

  // 14. Existing resolved incident in completed history does not appear in active notifications
  it('14. resolved incidents appear in completed history archive and never in active notifications', async () => {
    await incidentService.verifyIncident('EC-0142');
    await incidentService.assignIncident('EC-0142', 'Crew', 'Action');
    await incidentService.updateIncidentStatus('EC-0142', 'IN_PROGRESS');
    await incidentService.updateIncidentStatus('EC-0142', 'RE_INSPECTION');
    await incidentService.updateIncidentStatus('EC-0142', 'CLOSED');

    // Active notifications empty
    expect(notificationService.getNotifications().length).toBe(0);

    // Available in Completed queue history
    const completedIncidents = await incidentService.getIncidents({ queueTab: 'completed' });
    expect(completedIncidents.some((i) => (i.code === 'EC-0142' || i.id === 'EC-0142') && i.status === 'CLOSED')).toBe(true);

    // Excluded from Active queue
    const activeIncidents = await incidentService.getIncidents({ queueTab: 'active' });
    expect(activeIncidents.some((i) => i.code === 'EC-0142' || i.id === 'EC-0142')).toBe(false);
  });
});
