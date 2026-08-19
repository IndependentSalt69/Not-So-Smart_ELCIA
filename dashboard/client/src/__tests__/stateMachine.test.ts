import { describe, expect, it } from 'vitest';
import { canTransition, getNextValidStatuses, getStatusMetadata, LIFECYCLE_STEPS } from '../lib/stateMachine';
import { IncidentStatus } from '../types/incident';

describe('Incident State Machine', () => {
  it('should allow valid transition from DETECTED to VERIFIED or REJECTED', () => {
    expect(canTransition('DETECTED', 'VERIFIED')).toBe(true);
    expect(canTransition('DETECTED', 'REJECTED')).toBe(true);
    expect(canTransition('DETECTED', 'ASSIGNED')).toBe(false);
    expect(canTransition('DETECTED', 'IN_PROGRESS')).toBe(false);
    expect(canTransition('DETECTED', 'CLOSED')).toBe(false);
  });

  it('should allow valid transition from VERIFIED to ASSIGNED or REJECTED', () => {
    expect(canTransition('VERIFIED', 'ASSIGNED')).toBe(true);
    expect(canTransition('VERIFIED', 'REJECTED')).toBe(true);
    expect(canTransition('VERIFIED', 'IN_PROGRESS')).toBe(false);
    expect(canTransition('VERIFIED', 'CLOSED')).toBe(false);
  });

  it('should allow transition from ASSIGNED to IN_PROGRESS only', () => {
    expect(canTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('ASSIGNED', 'CLOSED')).toBe(false);
    expect(canTransition('ASSIGNED', 'VERIFIED')).toBe(false);
  });

  it('should allow transition from IN_PROGRESS to RE_INSPECTION only', () => {
    expect(canTransition('IN_PROGRESS', 'RE_INSPECTION')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'CLOSED')).toBe(false);
  });

  it('should allow transition from RE_INSPECTION to CLOSED or back to IN_PROGRESS', () => {
    expect(canTransition('RE_INSPECTION', 'CLOSED')).toBe(true);
    expect(canTransition('RE_INSPECTION', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('RE_INSPECTION', 'DETECTED')).toBe(false);
  });

  it('CLOSED should be a terminal state with zero forward transitions', () => {
    const next = getNextValidStatuses('CLOSED');
    expect(next).toEqual([]);
    expect(canTransition('CLOSED', 'DETECTED')).toBe(false);
    expect(canTransition('CLOSED', 'IN_PROGRESS')).toBe(false);
  });

  it('REJECTED state can optionally transition back to DETECTED for re-opening', () => {
    expect(canTransition('REJECTED', 'DETECTED')).toBe(true);
    expect(canTransition('REJECTED', 'CLOSED')).toBe(false);
  });

  it('disallows self transitions', () => {
    const statuses: IncidentStatus[] = [
      'DETECTED',
      'VERIFIED',
      'ASSIGNED',
      'IN_PROGRESS',
      'RE_INSPECTION',
      'CLOSED',
      'REJECTED',
    ];
    statuses.forEach((st) => {
      expect(canTransition(st, st)).toBe(false);
    });
  });

  it('provides metadata for all statuses', () => {
    LIFECYCLE_STEPS.forEach((st) => {
      const meta = getStatusMetadata(st);
      expect(meta.label).toBeDefined();
      expect(meta.badgeBg).toBeDefined();
      expect(meta.dotColor).toBeDefined();
    });
  });
});
