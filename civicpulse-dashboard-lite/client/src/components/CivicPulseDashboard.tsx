import React, { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Bell, Search, AlertCircle, Zap, AlertTriangle, Users, Camera, ShieldAlert } from 'lucide-react';

// Mock data
const monsoonsData = [
  { month: 'Jan', incidents: 145, waterlogged: 32500 },
  { month: 'Feb', incidents: 198, waterlogged: 42100 },
  { month: 'Mar', incidents: 267, waterlogged: 58900 },
  { month: 'Apr', incidents: 312, waterlogged: 71200 },
  { month: 'May', incidents: 398, waterlogged: 89600 },
  { month: 'Jun', incidents: 456, waterlogged: 102300 },
  { month: 'Jul', incidents: 599, waterlogged: 257600 }
];

// Root causes ordered by urgency: Red (Critical) -> Orange (High) -> Yellow (Moderate) -> Green (Safe/Minor)
const rootCausesData = [
  { name: 'Heavy Rainfall / Surface Runoff', value: 52, color: '#EF4444', urgency: 'Critical Urgency' },
  { name: 'Drainage Overflow / Blockage', value: 23.6, color: '#F97316', urgency: 'High Urgency' },
  { name: 'Road Surface Decay', value: 18.3, color: '#EAB308', urgency: 'Moderate' },
  { name: 'Other Factors', value: 6.1, color: '#22C55E', urgency: 'Low / Safe' }
];

// Infrastructure types with severity color mapping
const infrastructureData = [
  { name: 'Major Junctions & Corridors', value: 59, color: '#EF4444', level: 'Critical Impact' },
  { name: 'Internal Campus Roads', value: 27, color: '#F97316', level: 'High Impact' },
  { name: 'Pedestrian Footpaths', value: 10, color: '#EAB308', level: 'Moderate' },
  { name: 'Other Civic Infrastructure', value: 4, color: '#22C55E', level: 'Safest' }
];

// Lifecycle stages with dynamic urgency-to-resolved color mapping
const incidentStages = [
  { name: 'Detected', color: '#EF4444', lightBg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  { name: 'Verified', color: '#F97316', lightBg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { name: 'Assigned', color: '#F59E0B', lightBg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { name: 'In Progress', color: '#84CC16', lightBg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  { name: 'Re-Inspection', color: '#0D9488', lightBg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  { name: 'Closed', color: '#10B981', lightBg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
];

const mockIncidents = [
  {
    id: 'EC-0142',
    class: 'Waterlogging',
    zone: 'EC-04 (Electronics City Main Junction)',
    confidence: 94,
    severity: 8.7,
    priority: 'P1 - Critical',
    priorityType: 'p1',
    action: 'Dispatch Drainage Maintenance + Traffic Caution',
    owner: 'Drainage Ops Team A',
    currentStage: 2
  },
  {
    id: 'EC-0141',
    class: 'Pothole',
    zone: 'EC-02 (Tech Park Road)',
    confidence: 87,
    severity: 6.2,
    priority: 'P2 - High',
    priorityType: 'p2',
    action: 'Schedule Road Repair',
    owner: 'Road Maintenance Team B',
    currentStage: 1
  },
  {
    id: 'EC-0140',
    class: 'Traffic Congestion',
    zone: 'EC-01 (Main Corridor)',
    confidence: 91,
    severity: 7.1,
    priority: 'P1 - Critical',
    priorityType: 'p1',
    action: 'Deploy Traffic Control',
    owner: 'Traffic Management',
    currentStage: 3
  }
];

interface MetricCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  subLabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, value, label, subLabel }) => (
  <div className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all duration-200 hover:border-zinc-300">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-2xl font-extrabold text-black tracking-tight">{value}</div>
      <div className="text-sm font-semibold text-zinc-700">{label}</div>
      {subLabel && <div className="text-xs text-zinc-500 font-medium">{subLabel}</div>}
    </div>
  </div>
);

const getSeverityBadge = (score: number) => {
  if (score >= 8.0) {
    return {
      label: 'Critical Danger (Urgent Action)',
      color: '#EF4444',
      bgClass: 'bg-red-50 border border-red-200 text-red-700',
      pillColor: 'bg-red-600 text-white'
    };
  }
  if (score >= 6.0) {
    return {
      label: 'High Severity (Action Needed)',
      color: '#F97316',
      bgClass: 'bg-orange-50 border border-orange-200 text-orange-700',
      pillColor: 'bg-orange-500 text-white'
    };
  }
  if (score >= 4.0) {
    return {
      label: 'Moderate Risk (Monitor Closely)',
      color: '#EAB308',
      bgClass: 'bg-amber-50 border border-amber-200 text-amber-700',
      pillColor: 'bg-amber-500 text-white'
    };
  }
  return {
    label: 'Low Risk (Safe / Minimal Action)',
    color: '#22C55E',
    bgClass: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
    pillColor: 'bg-emerald-600 text-white'
  };
};

const getPriorityBadgeStyle = (priority: string) => {
  if (priority.includes('P1') || priority.toLowerCase().includes('critical')) {
    return 'bg-red-600 text-white ring-1 ring-red-700';
  }
  if (priority.includes('P2') || priority.toLowerCase().includes('high')) {
    return 'bg-orange-500 text-white ring-1 ring-orange-600';
  }
  if (priority.includes('P3') || priority.toLowerCase().includes('medium')) {
    return 'bg-amber-500 text-white ring-1 ring-amber-600';
  }
  return 'bg-emerald-600 text-white ring-1 ring-emerald-700';
};

const CivicPulseDashboard: React.FC = () => {
  const [selectedIncident, setSelectedIncident] = useState(0);
  const [incidentStage, setIncidentStage] = useState(mockIncidents[0].currentStage);
  const currentIncident = mockIncidents[selectedIncident];
  const severityBadge = getSeverityBadge(currentIncident.severity);

  const handleStageClick = (stageIndex: number) => {
    setIncidentStage(stageIndex);
  };

  const handleIncidentSwitch = (index: number) => {
    setSelectedIncident(index);
    setIncidentStage(mockIncidents[index].currentStage);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-zinc-900">
      {/* Navigation Bar */}
      <nav className="bg-zinc-950 border-b border-zinc-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">CivicPulse</h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
                  Ops Lite
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Smart City Monsoon Risk Intelligence</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <a href="#" className="text-sm font-semibold text-white transition-colors border-b-2 border-white pb-1">
              Overview
            </a>
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors pb-1">
              Incidents Queue
            </a>
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors pb-1">
              Analytics
            </a>
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors pb-1">
              Drone Feeds
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search zone, incident ID..."
                className="pl-10 pr-4 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent w-60 transition-all"
              />
            </div>
            <button
              className="relative p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Left Floating Sidebar */}
      <div className="fixed left-4 top-32 z-40 hidden xl:flex flex-col gap-3">
        <button
          className="w-11 h-11 rounded-xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:bg-black hover:text-white transition-all flex items-center justify-center text-zinc-700"
          title="Telegram Alerts Channel"
        >
          <span className="text-base">📱</span>
        </button>
        <button
          className="w-11 h-11 rounded-xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:bg-black hover:text-white transition-all flex items-center justify-center text-zinc-700"
          title="System Alerts Feed"
        >
          <AlertCircle className="w-5 h-5" />
        </button>
        <button
          className="w-11 h-11 rounded-xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:bg-black hover:text-white transition-all flex items-center justify-center text-zinc-700"
          title="Field Support Hotline"
        >
          <span className="text-base">🎧</span>
        </button>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Left Column - Main Content & Charts */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-zinc-600">Total Waterlogged Area</p>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                    Live Extent
                  </span>
                </div>
                <p className="text-4xl font-black text-black tracking-tight">257,600 <span className="text-xl font-bold text-zinc-500">m²</span></p>
                <p className="text-xs text-zinc-500 mt-2 font-medium">↑ 18.4% surge recorded in Electronics City Phase 1</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-zinc-600">Active Civic Incidents</p>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-900 text-white">
                    Prioritized
                  </span>
                </div>
                <p className="text-4xl font-black text-black tracking-tight">2,375</p>
                <p className="text-xs text-zinc-500 mt-2 font-medium">88% verified by AI drone & traffic sensor footage</p>
              </div>
            </div>

            {/* Merged Single Bar Graph with Both Metrics Side by Side */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm flex flex-col items-center">
              <div className="text-center mb-6 w-full max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-xs font-semibold text-zinc-700 mb-2">
                  <span>Monsoon Analytics</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-black tracking-tight">
                  Monsoon Incidents & Waterlogging Extent
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
                  Monthly incident count (Left Axis) & surface area inundated in m² (Right Axis) (Jan – Jul 2026)
                </p>
              </div>

              <div className="w-full flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={monsoonsData}
                    barGap={6}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      fontSize={12}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#09090B"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={(v) => `${v}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={(v) => `${v / 1000}k`}
                    />
                    <Tooltip
                      cursor={{ fill: '#F8FAFC' }}
                      contentStyle={{
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                        fontSize: '12px',
                        padding: '10px 14px'
                      }}
                      itemStyle={{ color: '#FFFFFF' }}
                      formatter={(value: any, name: any) => {
                        if (name === 'incidents') return [`${value} Incidents`, 'Monthly Incidents'];
                        if (name === 'waterlogged') return [`${Number(value).toLocaleString()} m²`, 'Waterlogged Extent'];
                        return [value, name];
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="incidents"
                      name="incidents"
                      fill="#09090B"
                      barSize={12}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="waterlogged"
                      name="waterlogged"
                      fill="#64748B"
                      barSize={12}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Centered Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
                <div className="flex items-center gap-2 text-zinc-800">
                  <div className="w-3 h-3 rounded-sm bg-black"></div>
                  <span>Total Monthly Incidents</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-600">
                  <div className="w-3 h-3 rounded-sm bg-slate-500"></div>
                  <span>Waterlogged Extent (m²)</span>
                </div>
              </div>
            </div>

            {/* Bottom Analytical Visualizations - Color coded Green to Red */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Root Causes Donut Chart - Severity Color Scale (Green -> Red) */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm flex flex-col items-center">
                <div className="text-center mb-2 w-full">
                  <h2 className="text-base font-bold text-black tracking-tight">Incident Root Causes</h2>
                  <p className="text-xs text-zinc-500 font-medium">Risk breakdown: <span className="text-emerald-600 font-semibold">Green (Safest)</span> to <span className="text-red-600 font-semibold">Red (Most Urgent)</span></p>
                </div>
                <div className="w-full flex justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={rootCausesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {rootCausesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#09090B',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px'
                        }}
                        itemStyle={{ color: '#FFFFFF' }}
                        formatter={(value) => `${value}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs w-full max-w-md">
                  {rootCausesData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-zinc-700 truncate font-medium text-[11px]">{item.name}</span>
                        <span className="text-[10px] font-semibold" style={{ color: item.color }}>{item.urgency}</span>
                      </div>
                      <span className="font-extrabold text-black ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Infrastructure Breakdown - Severity Color Scale (Green -> Red) */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-sm flex flex-col items-center">
                <div className="text-center mb-2 w-full">
                  <h2 className="text-base font-bold text-black tracking-tight">Affected Infrastructure Types</h2>
                  <p className="text-xs text-zinc-500 font-medium">Impact level: <span className="text-emerald-600 font-semibold">Green (Safest)</span> to <span className="text-red-600 font-semibold">Red (Most Urgent)</span></p>
                </div>
                <div className="w-full space-y-4 pt-3">
                  {infrastructureData.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                            {item.level}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-zinc-800 truncate">{item.name}</span>
                        </div>
                        <span className="text-sm font-extrabold" style={{ color: item.color }}>{item.value}%</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-500 shadow-sm"
                          style={{
                            width: `${item.value}%`,
                            backgroundColor: item.color
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Secondary Metric Cards */}
          <div className="lg:col-span-1 space-y-3.5">
            <MetricCard
              icon={<AlertTriangle className="w-5 h-5 text-white" />}
              value="2,089"
              label="Critical Alerts"
              subLabel="P1 Emergency Priority"
            />
            <MetricCard
              icon={<AlertCircle className="w-5 h-5 text-white" />}
              value="26,872"
              label="Potholes & Surface"
              subLabel="Defects Identified"
            />
            <MetricCard
              icon={<Zap className="w-5 h-5 text-white" />}
              value="3,875"
              label="Traffic Corridors"
              subLabel="Active Bottlenecks"
            />
            <MetricCard
              icon={<Users className="w-5 h-5 text-white" />}
              value="4,875"
              label="Field Personnel"
              subLabel="Deployed Response Teams"
            />
            <MetricCard
              icon={<Camera className="w-5 h-5 text-white" />}
              value="1,426"
              label="AI Sensor Streams"
              subLabel="Drones & Fixed CCTVs"
            />
          </div>
        </div>

        {/* Live Incident Inspector Section with Green-to-Red Urgency Scale */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-black tracking-tight">Live Incident Inspector</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  Priority Dispatch
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Real-time incident response, severity assessment, and operational assignment</p>
            </div>

            {/* Incident Switcher Tabs with Severity Dots */}
            <div className="flex gap-2 flex-wrap">
              {mockIncidents.map((incident, idx) => {
                const isSelected = selectedIncident === idx;
                const isCritical = incident.severity >= 8.0;
                return (
                  <button
                    key={incident.id}
                    onClick={() => handleIncidentSwitch(idx)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isSelected
                        ? isCritical
                          ? 'bg-red-600 text-white shadow-md ring-1 ring-red-700'
                          : 'bg-orange-500 text-white shadow-md ring-1 ring-orange-600'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200/60'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-white' : isCritical ? 'bg-red-500' : 'bg-orange-500'
                      }`}
                    ></span>
                    <span>{incident.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incident Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Incident ID</p>
                <p className="text-xl font-black text-black">{currentIncident.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Classification</p>
                <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-lg text-sm font-bold">
                  {currentIncident.class}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Impact Zone</p>
                <p className="text-sm font-medium text-zinc-800">{currentIncident.zone}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">AI Detection Confidence</p>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-black text-black">{currentIncident.confidence}%</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    High Accuracy
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Severity Rating (1 – 10)</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-2xl font-black" style={{ color: severityBadge.color }}>
                    {currentIncident.severity} <span className="text-sm font-semibold text-zinc-400">/ 10</span>
                  </p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${severityBadge.bgClass}`}>
                    {severityBadge.label}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Action Priority</p>
                <span className={`inline-block px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-sm ${getPriorityBadgeStyle(currentIncident.priority)}`}>
                  {currentIncident.priority}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-xl">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Recommended Civic Action</p>
              <p className="text-sm font-semibold text-black">{currentIncident.action}</p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-xl">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Assigned Operations Team</p>
              <p className="text-sm font-semibold text-black">{currentIncident.owner}</p>
            </div>
          </div>

          {/* Lifecycle Stepper - Severity to Resolved Progression (Red/Orange -> Green) */}
          <div className="border-t border-zinc-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Incident Lifecycle Progress</p>
              <span className="text-xs font-semibold text-zinc-500">
                Phase <span className="font-bold text-black">{incidentStage + 1}</span> of {incidentStages.length}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
              {incidentStages.map((stage, idx) => {
                const isCurrent = incidentStage === idx;
                const isPassed = incidentStage > idx;
                return (
                  <React.Fragment key={stage.name}>
                    <button
                      onClick={() => handleStageClick(idx)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs whitespace-nowrap transition-all ${
                        isCurrent
                          ? 'text-white shadow-md ring-1'
                          : isPassed
                          ? `${stage.lightBg} ${stage.text} ${stage.border} border font-medium`
                          : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300'
                      }`}
                      style={{
                        backgroundColor: isCurrent ? stage.color : undefined,
                        borderColor: isCurrent ? stage.color : undefined
                      }}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCurrent ? 'bg-white' : isPassed ? 'opacity-90' : 'bg-zinc-300'
                        }`}
                        style={{ backgroundColor: !isCurrent && isPassed ? stage.color : undefined }}
                      ></span>
                      <span>{stage.name}</span>
                    </button>
                    {idx < incidentStages.length - 1 && (
                      <div
                        className={`flex-1 h-1 rounded-full min-w-3 transition-colors ${
                          incidentStage > idx ? 'opacity-80' : 'bg-zinc-200'
                        }`}
                        style={{
                          backgroundColor: incidentStage > idx ? incidentStages[idx].color : undefined
                        }}
                      ></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CivicPulseDashboard;


