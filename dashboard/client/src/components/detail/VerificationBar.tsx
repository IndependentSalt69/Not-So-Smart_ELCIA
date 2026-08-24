import { Button } from '@/components/ui/button';
import { Incident } from '@/types/incident';
import { CheckCircle2, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import React, { useState } from 'react';

interface VerificationBarProps {
  incident: Incident;
  onVerify: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

export const VerificationBar: React.FC<VerificationBarProps> = ({
  incident,
  onVerify,
  onReject,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Optical reflection / Specular glare on wet road');

  if (incident.status === 'REJECTED') {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <XCircle className="w-4 h-4 text-slate-500" />
          <span>Incident marked as False Positive / Rejected</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onVerify(incident.id, 'Re-opened by operator for verification')}
          className="text-xs font-semibold h-8 rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Re-open for Review
        </Button>
      </div>
    );
  }

  if (incident.status !== 'DETECTED') {
    return null;
  }

  const handleVerify = async () => {
    try {
      setLoading(true);
      await onVerify(incident.id, 'Confirmed genuine incident from drone sensor evidence');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      await onReject(incident.id, rejectReason);
      setShowRejectForm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
            Human-in-the-Loop Triage Required
          </span>
        </div>
        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          Verify AI detection before field team dispatch
        </span>
      </div>

      {showRejectForm ? (
        <div className="space-y-3 pt-2">
          <div className="text-xs xl:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Select rejection rationale:
          </div>
          <select
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full h-10 rounded-xl text-xs xl:text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 font-medium text-zinc-800 dark:text-zinc-200"
          >
            <option value="Optical reflection / Specular glare on wet road">
              Optical reflection / Specular glare on wet road
            </option>
            <option value="Transient shadow / Tree canopy optical distortion">
              Transient shadow / Tree canopy optical distortion
            </option>
            <option value="Water depth below operational threshold (<5cm)">
              Water depth below operational threshold (&lt;5cm)
            </option>
            <option value="Surface discoloration / Construction gravel texture">
              Surface discoloration / Construction gravel texture
            </option>
            <option value="Duplicate scan of adjacent corridor marker">
              Duplicate scan of adjacent corridor marker
            </option>
          </select>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectForm(false)}
              className="h-9 text-xs xl:text-sm font-bold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={loading}
              className="h-9 text-xs xl:text-sm font-bold rounded-xl cursor-pointer"
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleVerify}
            disabled={loading}
            size="sm"
            className="flex-1 h-10 rounded-xl text-xs xl:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>Verify Incident</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRejectForm(true)}
            disabled={loading}
            className="h-10 rounded-xl text-xs xl:text-sm font-bold border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            <span>Reject (False Positive)</span>
          </Button>
        </div>
      )}
    </div>
  );
};
