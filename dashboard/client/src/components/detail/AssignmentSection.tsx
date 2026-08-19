import { Button } from '@/components/ui/button';
import { Incident } from '@/types/incident';
import { Check, Send, Users, Wrench } from 'lucide-react';
import React, { useState } from 'react';

interface AssignmentSectionProps {
  incident: Incident;
  onAssign: (id: string, owner: string, action: string) => Promise<void>;
}

export const AssignmentSection: React.FC<AssignmentSectionProps> = ({
  incident,
  onAssign,
}) => {
  const isWater = incident.type === 'waterlogging';

  const defaultTeams = isWater
    ? [
        'Drainage Operations Team A',
        'Emergency Pump Unit 2 (Phase 1)',
        'Drainage Rapid Response Crew C',
        'ELCIA Stormwater Maintenance Unit',
      ]
    : [
        'Road Surface Maintenance Team B',
        'Emergency Asphalt Patching Crew 1',
        'Heavy Infrastructure Repair Team A',
        'ELCIA Civil Works Crew 3',
      ];

  const defaultActions = isWater
    ? [
        'Deploy high-capacity mobile de-watering sump pumps & unblock storm drain grates',
        'Desilt stormwater culvert mouth and clear outflow channel',
        'Sweep road debris & open curb drainage grates',
        'Set up high-water hazard signage & divert light vehicular traffic',
      ]
    : [
        'Deploy Cold-Mix Bitumen Patching & Place High-Visibility Hazard Barricades',
        'Rapid asphalt patch and heavy load vibratory compaction',
        'Cold patch leveling and bitumen edge sealing',
        'Excavate collapsed sub-base and lay rapid-cure concrete patch',
      ];

  const [selectedOwner, setSelectedOwner] = useState<string>(incident.owner || defaultTeams[0]);
  const [selectedAction, setSelectedAction] = useState<string>(incident.recommendedAction || defaultActions[0]);
  const [loading, setLoading] = useState<boolean>(false);

  // If incident is in VERIFIED status, show the active assignment form
  if (incident.status === 'VERIFIED') {
    const handleAssign = async () => {
      try {
        setLoading(true);
        await onAssign(incident.id, selectedOwner, selectedAction);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Operational Dispatch & Mitigation Assignment</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Select Response Team:
            </label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full h-9 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 font-medium text-zinc-900 dark:text-zinc-100"
            >
              {defaultTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Recommended Mitigation Protocol:
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full h-9 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 font-medium text-zinc-900 dark:text-zinc-100"
            >
              {defaultActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          onClick={handleAssign}
          disabled={loading}
          className="w-full h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          <span>Assign & Dispatch Team</span>
        </Button>
      </div>
    );
  }

  // If already assigned or further in lifecycle
  if (incident.owner) {
    return (
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
          <Wrench className="w-3.5 h-3.5 text-emerald-500" />
          <span>Assigned Mitigation Unit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Assigned Crew:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{incident.owner}</span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Mitigation Procedure:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2">
              {incident.recommendedAction}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
