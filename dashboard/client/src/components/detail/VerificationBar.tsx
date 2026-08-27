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
            Verification Required
          </span>
        </div>
        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          Verify issue before assigning to repair team
        </span>
      </div>

      {showRejectForm ? (
        <div className="space-y-3 pt-2">
          <div className="text-xs xl:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Specify reason for rejecting issue:
          </div>

          <div className="space-y-2">
            {[
              'Optical reflection / Specular glare on wet road',
              'Shadow artifact / Camera noise',
              'Normal wet surface — non-hazardous ponding',
              'Non-actionable / Insignificant depth',
            ].map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <input
                  type="radio"
                  name="rejectReason"
                  checked={rejectReason === reason}
                  onChange={() => setRejectReason(reason)}
                  className="accent-rose-600"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectForm(false)}
              className="text-xs font-semibold h-8 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={handleReject}
              className="text-xs font-semibold h-8 rounded-lg bg-rose-600 hover:bg-rose-700"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Confirm Rejection
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRejectForm(true)}
            className="text-xs font-bold h-9 rounded-xl border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/40"
          >
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
            Reject Issue
          </Button>

          <Button
            size="sm"
            disabled={loading}
            onClick={handleVerify}
            className="text-xs font-bold h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Verify Issue
          </Button>
        </div>
      )}
    </div>
  );
};
