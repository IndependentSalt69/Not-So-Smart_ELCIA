import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { verificationService } from '@/services/verificationService';
import {
  AlertTriangle,
  CircleDot,
  Droplets,
  Footprints,
  MapPin,
  Send,
  Waves,
  X,
  ShieldAlert,
  Clock,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';

interface ManualAnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  videoPlaybackTime?: number;
  flightGpsPoint?: { lat: number; lng: number } | null;
  zoneId?: string;
  onAnomalyCreated: (incidentId: string) => void;
}

const HAZARD_OPTIONS = [
  {
    type: 'WATERLOGGING' as const,
    label: 'Waterlogging',
    description: 'Roadway water accumulation / ponding',
    icon: Droplets,
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
  },
  {
    type: 'POTHOLE' as const,
    label: 'Pothole',
    description: 'Road surface crater / structural void',
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
  },
  {
    type: 'DRAINAGE_OVERFLOW' as const,
    label: 'Drainage Overflow',
    description: 'Stormwater culvert / silt obstruction',
    icon: Waves,
    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
  },
  {
    type: 'DAMAGED_FOOTPATH' as const,
    label: 'Damaged Footpath',
    description: 'Pedestrian pavement slab fracture',
    icon: Footprints,
    color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800',
  },
  {
    type: 'OPEN_MANHOLE' as const,
    label: 'Open Manhole',
    description: 'Missing or displaced sewer lid hazard',
    icon: CircleDot,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
  },
];

export const ManualAnomalyModal: React.FC<ManualAnomalyModalProps> = ({
  isOpen,
  onClose,
  jobId,
  videoPlaybackTime = 0,
  flightGpsPoint = null,
  zoneId = 'EC-01',
  onAnomalyCreated,
}) => {
  const [hazardType, setHazardType] = useState<'WATERLOGGING' | 'POTHOLE' | 'DRAINAGE_OVERFLOW' | 'DAMAGED_FOOTPATH' | 'OPEN_MANHOLE'>('POTHOLE');
  const [priority, setPriority] = useState<'P1' | 'P2' | 'P3'>('P2');
  const [severityScore, setSeverityScore] = useState<number>(6.5);
  const [timestampSec, setTimestampSec] = useState<number>(videoPlaybackTime);
  const [selectedZone, setSelectedZone] = useState<string>(zoneId || 'EC-01');
  const [customZoneName, setCustomZoneName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // GPS Location Fields (GPS Safety Guarantee)
  const [latitude, setLatitude] = useState<string>(
    flightGpsPoint?.lat ? String(flightGpsPoint.lat) : ''
  );
  const [longitude, setLongitude] = useState<string>(
    flightGpsPoint?.lng ? String(flightGpsPoint.lng) : ''
  );
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTimestampSec(Math.round(videoPlaybackTime * 10) / 10);
      if (flightGpsPoint?.lat && flightGpsPoint?.lng) {
        setLatitude(String(flightGpsPoint.lat));
        setLongitude(String(flightGpsPoint.lng));
      } else {
        setLatitude('');
        setLongitude('');
      }
      setSelectedZone(zoneId || 'EC-01');
      setCustomZoneName('');
    }
  }, [isOpen, videoPlaybackTime, flightGpsPoint, zoneId]);

  if (!isOpen) return null;

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  const hasValidLocation =
    !isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidLocation) {
      toast.error('Explicit GPS location is required. Please provide valid Latitude and Longitude coordinates.');
      return;
    }

    if (selectedZone === 'OTHER') {
      const trimmedCustom = customZoneName.trim();
      if (!trimmedCustom) {
        toast.error('Please enter a custom zone name when "Other" is selected.');
        return;
      }
      if (trimmedCustom.length > 128) {
        toast.error('Custom zone name cannot exceed 128 characters.');
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        hazard_type: hazardType,
        priority,
        severity_score: severityScore,
        description: notes.trim() || `Manual ${hazardType} incident reported by operator from flight ${jobId.slice(0, 8)}`,
        timestamp_sec: timestampSec,
        zone_id: selectedZone === 'OTHER' ? 'OTHER' : selectedZone,
        custom_zone_name: selectedZone === 'OTHER' ? customZoneName.trim() : undefined,
        location: {
          type: 'Point' as const,
          coordinates: [lngNum, latNum] as [number, number],
        },
      };

      const res = await verificationService.reportAnomaly(jobId, payload);
      toast.success('Manual Incident Created Successfully!', {
        description: `Registered genuine incident ${res.incident.incident_code} from drone surveillance footage.`,
      });
      onAnomalyCreated(res.incident.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to report anomaly:', err);
      toast.error(err.message || 'Failed to create manual incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                Report Undetected Civic Hazard
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Flight Job {jobId.slice(0, 8)} • Register a genuine incident from aerial footage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {/* Hazard Class Selector Grid */}
          <div className="space-y-2">
            <label className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>Select Hazard Classification</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HAZARD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = hazardType === opt.type;
                return (
                  <div
                    key={opt.type}
                    onClick={() => setHazardType(opt.type)}
                    className={cn(
                      'p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3',
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm'
                        : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-600'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border',
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900 border-transparent'
                          : opt.color
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{opt.label}</div>
                      <div className={cn('text-[11px] truncate', isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400')}>
                        {opt.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority & Severity Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-bold text-zinc-900 dark:text-zinc-100">Priority Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['P1', 'P2', 'P3'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'py-2 px-3 rounded-xl text-xs font-black transition-all border cursor-pointer',
                      priority === p
                        ? p === 'P1'
                          ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                          : p === 'P2'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    )}
                  >
                    {p} {p === 'P1' ? '(Critical)' : p === 'P2' ? '(Medium)' : '(Low)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-900 dark:text-zinc-100">Severity Score</label>
                <span className="font-mono font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  {severityScore.toFixed(1)} / 10.0
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.1"
                value={severityScore}
                onChange={(e) => setSeverityScore(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Time & Zone Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Video Timestamp (Seconds)</span>
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={timestampSec}
                onChange={(e) => setTimestampSec(parseFloat(e.target.value) || 0)}
                className="rounded-xl h-10 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-zinc-900 dark:text-zinc-100">Operational Zone</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full h-10 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 font-medium text-zinc-900 dark:text-zinc-100"
              >
                <option value="EC-01">EC-01 (Phase 1 - West)</option>
                <option value="EC-02">EC-02 (Phase 1 - East)</option>
                <option value="EC-03">EC-03 (Phase 2 - North)</option>
                <option value="EC-04">EC-04 (Main Junction Corridor)</option>
                <option value="OTHER">Other (Custom Zone)</option>
              </select>
            </div>
          </div>

          {/* Custom Zone Name input when OTHER is selected */}
          {selectedZone === 'OTHER' && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                Custom Operational Zone Name <span className="text-rose-500">*</span>:
              </label>
              <Input
                type="text"
                placeholder="Enter custom zone name (max 128 chars)"
                value={customZoneName}
                onChange={(e) => setCustomZoneName(e.target.value.slice(0, 128))}
                maxLength={128}
                required
                className="rounded-xl h-10 text-xs bg-white dark:bg-zinc-900 border-emerald-300 dark:border-emerald-700"
              />
            </div>
          )}

          {/* GPS Coordinates & Safety Check */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>Geographic Incident Coordinates (WGS-84)</span>
                <span className="text-rose-500">*</span>
              </label>
              {flightGpsPoint ? (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  <span>Flight GPS Detected</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                  Manual Entry Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold block mb-1">
                  Latitude (e.g. 12.840)
                </span>
                <Input
                  type="text"
                  placeholder="12.84024"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="rounded-xl h-9.5 font-mono text-xs"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold block mb-1">
                  Longitude (e.g. 77.675)
                </span>
                <Input
                  type="text"
                  placeholder="77.67542"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="rounded-xl h-9.5 font-mono text-xs"
                />
              </div>
            </div>

            {!hasValidLocation && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold pt-1">
                ⚠️ Valid latitude and longitude coordinates are mandatory to create an operational incident.
              </div>
            )}
          </div>

          {/* Operator Observation Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-900 dark:text-zinc-100">
              Observation Notes & Context
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context on why this hazard requires municipal response (e.g. Obscured under low light, near pedestrian crossing)..."
              className="w-full rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-3 font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 text-xs font-bold rounded-xl border-zinc-300 dark:border-zinc-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasValidLocation}
              className="h-10 px-6 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/25 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>{loading ? 'Creating Incident...' : 'Create & Open Incident'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
