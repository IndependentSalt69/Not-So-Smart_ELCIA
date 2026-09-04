import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { IncidentDetailDrawer } from '@/components/detail/IncidentDetailDrawer';
import { DroneIngestionStudio } from '@/components/ingestion/DroneIngestionStudio';
import { IncidentQueueView } from '@/components/incidents/IncidentQueueView';
import { DashboardView, Navbar } from '@/components/layout/Navbar';
import { IncidentMapView } from '@/components/map/IncidentMapView';
import { OverviewTab } from '@/components/overview/OverviewTab';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useIncidents } from '@/hooks/useIncidents';
import { Incident, IncidentFilters, IncidentStatus } from '@/types/incident';
import React, { useState } from 'react';
import { toast } from 'sonner';

export default function CivicPulseDashboard() {
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const {
    incidents,
    tabCounts,
    loading: incidentsLoading,
    filters,
    setFilters,
    getIncidentById,
    verifyIncident,
    rejectIncident,
    assignIncident,
    updateStatus,
  } = useIncidents();

  const { data: analytics, loading: analyticsLoading } = useAnalytics();

  // Metrics for Navbar badges
  const pendingCount = incidents.filter((i) => i.status === 'DETECTED').length;
  const criticalCount = incidents.filter(
    (i) => i.priority === 'P1' && i.status !== 'CLOSED' && i.status !== 'REJECTED'
  ).length;

  const handleSelectIncident = async (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDrawerOpen(true);

    try {
      const fresh = await getIncidentById(incident.id);
      if (fresh) {
        setSelectedIncident(fresh);
      }
    } catch (err) {
      console.warn('Failed to fetch fresh detail for incident:', incident.id, err);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleApplyFilter = (newFilters: Partial<IncidentFilters>) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleResetFilters = () => {
    setFilters({ queueTab: filters.queueTab || 'active' });
    toast.info('All filters have been reset.');
  };

  const handleIncidentPublished = async (incidentId: string) => {
    try {
      const published =
        incidents.find((i) => i.id === incidentId || i.code === incidentId) ||
        (await getIncidentById(incidentId));
      if (published) {
        setSelectedIncident(published);
        setIsDrawerOpen(true);
      }
    } catch (err) {
      console.warn('Failed to open published incident:', incidentId, err);
    }
  };

  const handleSelectIncidentById = async (incidentId: string) => {
    try {
      const found =
        incidents.find((i) => i.id === incidentId || i.code === incidentId) ||
        (await getIncidentById(incidentId));
      if (found) {
        setSelectedIncident(found);
        setIsDrawerOpen(true);
      }
    } catch (err) {
      console.warn('Failed to open incident from notification:', incidentId, err);
    }
  };

  // Operations Lifecycle Handlers
  const handleVerify = async (id: string, notes?: string) => {
    try {
      const updated = await verifyIncident(id, 'Command Operator', notes);
      setSelectedIncident(updated);
      toast.success(`Incident ${updated.code || updated.id} has been verified!`, {
        description: 'Ready for response team assignment.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify incident');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const updated = await rejectIncident(id, reason, 'Command Operator');
      setSelectedIncident(updated);
      toast.info(`Incident ${updated.code || updated.id} marked as False Positive.`, {
        description: reason,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject incident');
    }
  };

  const handleAssign = async (id: string, owner: string, action: string, assignedToUserId?: string) => {
    try {
      const updated = await assignIncident(id, owner, action, 'Dispatch Supervisor', assignedToUserId);
      setSelectedIncident(updated);
      toast.success(`Dispatched ${updated.code || updated.id} to ${owner}`, {
        description: action,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign incident');
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: IncidentStatus, notes?: string) => {
    try {
      const updated = await updateStatus(id, nextStatus, 'Operations Control', notes);
      setSelectedIncident(updated);
      toast.success(`Incident ${updated.code || updated.id} advanced to ${nextStatus}`, {
        description: notes,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update incident status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col font-sans">
      {/* Top Fixed Command Header */}
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
        pendingCount={pendingCount}
        criticalCount={criticalCount}
        onSelectIncidentId={handleSelectIncidentById}
      />

      {/* Main Content View Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16 py-6 sm:py-8 xl:py-10">
        {activeView === 'overview' && (
          <OverviewTab
            incidents={incidents}
            analytics={analytics}
            onSelectIncident={handleSelectIncident}
            onNavigateView={setActiveView}
            onApplyFilter={handleApplyFilter}
          />
        )}

        {activeView === 'queue' && (
          <IncidentQueueView
            incidents={incidents}
            tabCounts={tabCounts}
            loading={incidentsLoading}
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            onSelectIncident={handleSelectIncident}
            onQuickEvidence={handleSelectIncident}
          />
        )}

        {activeView === 'map' && (
          <IncidentMapView
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
          />
        )}

        {activeView === 'ingest' && (
          <DroneIngestionStudio
            onIncidentPublished={handleIncidentPublished}
          />
        )}

        {activeView === 'analytics' && (
          <AnalyticsDashboard
            analytics={analytics}
            loading={analyticsLoading}
            onSelectType={(type) => {
              setFilters({ ...filters, type });
              setActiveView('queue');
              toast.info(`Filtered Incident Queue by ${type.replace('_', ' ')}`);
            }}
          />
        )}
      </main>

      {/* Comprehensive Incident Inspection & Operations Drawer */}
      <IncidentDetailDrawer
        incident={selectedIncident}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onVerify={handleVerify}
        onReject={handleReject}
        onAssign={handleAssign}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
