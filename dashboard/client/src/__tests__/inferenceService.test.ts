import { beforeEach, describe, expect, it } from 'vitest';
import { incidentService } from '../services/incidentService';
import { inferenceService } from '../services/inferenceService';

describe('inferenceService', () => {
  beforeEach(() => {
    process.env.VITE_USE_MOCK_DATA = 'true';
    incidentService.resetToMockData();
  });
  it('should return sample footage presets', () => {
    const presets = inferenceService.getSamplePresets();
    expect(presets.length).toBeGreaterThanOrEqual(3);

    const waterPreset = presets.find((p) => p.type === 'waterlogging');
    const potholePreset = presets.find((p) => p.type === 'pothole');
    const manholePreset = presets.find((p) => p.type === 'open_manhole');
    const clearPreset = presets.find((p) => p.type === 'clear');

    expect(waterPreset).toBeDefined();
    expect(potholePreset).toBeDefined();
    expect(manholePreset).toBeDefined();
    expect(clearPreset).toBeDefined();
  });

  it('should run simulated multi-stage inference for waterlogging', async () => {
    const presets = inferenceService.getSamplePresets();
    const waterPreset = presets.find((p) => p.type === 'waterlogging')!;

    const stagesVisited: string[] = [];
    let lastProgress = 0;

    const result = await inferenceService.analyzeMedia({
      mediaUrl: waterPreset.mediaUrl,
      mediaType: 'image',
      telemetry: waterPreset.defaultTelemetry,
      presetType: 'waterlogging',
      onProgress: (stage, progress) => {
        stagesVisited.push(stage);
        lastProgress = progress;
      },
    });

    expect(stagesVisited.length).toBe(5);
    expect(lastProgress).toBe(100);
    expect(result.type).toBe('waterlogging');
    expect(result.priority).toBe('P1');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.severity).toBeGreaterThan(7.0);
    expect(result.waterAreaSqm).toBe(380);
    expect(result.boundingBoxes.length).toBeGreaterThan(0);
    expect(result.overlayMediaUrl).toContain('svg');
  });

  it('should run simulated multi-stage inference for open_manhole', async () => {
    const presets = inferenceService.getSamplePresets();
    const manholePreset = presets.find((p) => p.type === 'open_manhole')!;

    const stagesVisited: string[] = [];
    let lastProgress = 0;

    const result = await inferenceService.analyzeMedia({
      mediaUrl: manholePreset.mediaUrl,
      mediaType: 'image',
      telemetry: manholePreset.defaultTelemetry,
      presetType: 'open_manhole',
      onProgress: (stage, progress) => {
        stagesVisited.push(stage);
        lastProgress = progress;
      },
    });

    expect(stagesVisited.length).toBe(5);
    expect(lastProgress).toBe(100);
    expect(result.type).toBe('open_manhole');
    expect(result.priority).toBe('P1');
    expect(result.confidence).toBe(0.97);
    expect(result.severity).toBe(9.5);
    expect(result.recommendedAction).toBe(
      'Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid.'
    );
    expect(result.overlayMediaUrl).toContain('svg');
  });

  it('should run inference for clear baseline without hazard', async () => {
    const presets = inferenceService.getSamplePresets();
    const clearPreset = presets.find((p) => p.type === 'clear')!;

    const result = await inferenceService.analyzeMedia({
      mediaUrl: clearPreset.mediaUrl,
      mediaType: 'image',
      telemetry: clearPreset.defaultTelemetry,
      presetType: 'clear',
    });

    expect(result.type).toBe('clear');
    expect(result.severity).toBeLessThan(3.0);
  });

  it('should publish inferred incident to live operations queue', async () => {
    const presets = inferenceService.getSamplePresets();
    const waterPreset = presets.find((p) => p.type === 'waterlogging')!;

    const result = await inferenceService.analyzeMedia({
      mediaUrl: waterPreset.mediaUrl,
      mediaType: 'image',
      telemetry: waterPreset.defaultTelemetry,
      presetType: 'waterlogging',
    });

    const incident = await inferenceService.publishAsIncident(result);
    expect(incident.id).toBe(result.id);
    expect(incident.status).toBe('DETECTED');

    // Verify it exists in incidentService
    const found = await incidentService.getIncidentById(incident.id);
    expect(found).toBeDefined();
    expect(found?.type).toBe('waterlogging');
  });

  it('should publish inferred open_manhole incident to live operations queue', async () => {
    const presets = inferenceService.getSamplePresets();
    const manholePreset = presets.find((p) => p.type === 'open_manhole')!;

    const result = await inferenceService.analyzeMedia({
      mediaUrl: manholePreset.mediaUrl,
      mediaType: 'image',
      telemetry: manholePreset.defaultTelemetry,
      presetType: 'open_manhole',
    });

    const incident = await inferenceService.publishAsIncident(result);
    expect(incident.id).toBe(result.id);
    expect(incident.status).toBe('DETECTED');
    expect(incident.type).toBe('open_manhole');

    // Verify it exists in incidentService
    const found = await incidentService.getIncidentById(incident.id);
    expect(found).toBeDefined();
    expect(found?.type).toBe('open_manhole');
    expect(found?.recommendedAction).toBe(
      'Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid.'
    );
  });

  it('should throw error when attempting to publish a clear road baseline as an incident', async () => {
    const presets = inferenceService.getSamplePresets();
    const clearPreset = presets.find((p) => p.type === 'clear')!;

    const result = await inferenceService.analyzeMedia({
      mediaUrl: clearPreset.mediaUrl,
      mediaType: 'image',
      telemetry: clearPreset.defaultTelemetry,
      presetType: 'clear',
    });

    await expect(inferenceService.publishAsIncident(result)).rejects.toThrow(
      'Cannot publish a clear road baseline as an active incident.'
    );
  });
});
