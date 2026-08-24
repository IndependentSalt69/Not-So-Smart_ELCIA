import { Button } from '@/components/ui/button';
import { incidentService } from '@/services/incidentService';
import { Incident, InspectionRecord, InspectionResult, User } from '@/types/incident';
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface InspectionSectionProps {
  incident: Incident;
}

export const InspectionSection: React.FC<InspectionSectionProps> = ({ incident }) => {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>('');
  const [selectedResult, setSelectedResult] = useState<InspectionResult>('RESOLVED');
  const [notes, setNotes] = useState<string>('Field verification completed. Hazard resolved.');
  const [loading, setLoading] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadInspectionsData() {
      try {
        const [records, userList] = await Promise.all([
          incidentService.getIncidentInspections(incident.id),
          incidentService.getUsers(),
        ]);
        if (isMounted) {
          setInspections(records);
          if (userList.length > 0) {
            setUsers(userList);
            setSelectedInspectorId(userList[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load inspection records for incident:', incident.id, err);
      }
    }
    loadInspectionsData();
    return () => {
      isMounted = false;
    };
  }, [incident.id]);

  const handleSubmitInspection = async () => {
    if (!selectedInspectorId) return;
    try {
      setLoading(true);
      const payload = {
        inspector_id: selectedInspectorId,
        result: selectedResult,
        notes: notes || 'Field inspection recorded by operator',
        location: {
          type: 'Point' as const,
          coordinates: [incident.coordinates.lng, incident.coordinates.lat] as [number, number],
        },
      };

      const created = await incidentService.createIncidentInspection(incident.id, payload);
      setInspections((prev) => [created, ...prev]);
      setShowForm(false);
    } catch (err: any) {
      console.error('Failed to submit inspection:', err);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result: InspectionResult) => {
    switch (result) {
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>RESOLVED</span>
          </span>
        );
      case 'PARTIALLY_RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>PARTIALLY RESOLVED</span>
          </span>
        );
      case 'NOT_RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>NOT RESOLVED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs xl:text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Field Verification & Resolution Inspections</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="text-xs xl:text-sm font-bold h-8.5 rounded-xl border-zinc-300 dark:border-zinc-700 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 mr-1.5" />
          {showForm ? 'Cancel' : 'Add Inspection Record'}
        </Button>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
          <div className="text-xs xl:text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Log Field Verification Record
          </div>

          <div className="space-y-3">
            {users.length > 0 && (
              <div>
                <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Field Inspector / Supervisor:
                </label>
                <select
                  value={selectedInspectorId}
                  onChange={(e) => setSelectedInspectorId(e.target.value)}
                  className="w-full h-10 rounded-xl text-xs xl:text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                Inspection Verification Result:
              </label>
              <select
                value={selectedResult}
                onChange={(e) => setSelectedResult(e.target.value as InspectionResult)}
                className="w-full h-10 rounded-xl text-xs xl:text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 font-medium text-zinc-900 dark:text-zinc-100"
              >
                <option value="RESOLVED">RESOLVED (Hazard completely cleared & verified)</option>
                <option value="PARTIALLY_RESOLVED">PARTIALLY RESOLVED (Follow-up work required)</option>
                <option value="NOT_RESOLVED">NOT RESOLVED (Hazard remains active / crew re-dispatch needed)</option>
              </select>
            </div>

            <div>
              <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                Inspection Notes & Observations:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 rounded-xl text-xs xl:text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 font-medium text-zinc-900 dark:text-zinc-100"
                placeholder="Enter field notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={handleSubmitInspection}
              disabled={loading || !selectedInspectorId}
              size="sm"
              className="h-9 text-xs xl:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
            >
              Submit Inspection Record
            </Button>
          </div>
        </div>
      )}

      {inspections.length > 0 ? (
        <div className="space-y-2.5">
          {inspections.map((insp) => (
            <div
              key={insp.id}
              className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 text-xs xl:text-sm space-y-2"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {getResultBadge(insp.result)}
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    Inspector: {users.find((u) => u.id === insp.inspectorId)?.name || 'Field Inspector'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {insp.inspectionTime
                      ? new Date(insp.inspectionTime).toLocaleString()
                      : new Date(insp.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {insp.notes && (
                <p className="text-zinc-700 dark:text-zinc-300 text-xs xl:text-sm font-medium pl-1 italic">
                  "{insp.notes}"
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-medium py-1">
          No field inspection verification records recorded yet.
        </div>
      )}
    </div>
  );
};
