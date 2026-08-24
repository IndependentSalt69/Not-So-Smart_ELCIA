# CivicPulse Dashboard Visual Refinement & Emoji Audit

**Audit Date**: August 2026  
**Scope**: `dashboard/client/src/`  
**Purpose**: UI/UX consistency and operational elevation pass for CivicPulse Municipal Command Center.

---

## 1. Operational UI Emoji Audit & Semantic Replacement Table

| File | Location | Current Emoji | Purpose | Replacement |
| --- | --- | --- | --- | --- |
| `components/incidents/IncidentCard.tsx` | Line 91 (List thumbnail badge) | `🌊` / `⚠️` | Thumbnail type indicator | `<Droplets className="w-3 h-3 text-teal-300" />` / `<AlertTriangle className="w-3 h-3 text-amber-300" />` |
| `components/incidents/IncidentCard.tsx` | Line 185 (Grid evidence overlay badge) | `🌊 Waterlogging` / `⚠️ Pothole` | Evidence frame type chip | `<Droplets className="w-3.5 h-3.5 mr-1 text-teal-300" /> Waterlogging` / `<AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-300" /> Pothole` |
| `components/incidents/IncidentFilters.tsx` | Lines 149–150 (Type filter switcher) | `🌊` / `⚠️` | Segmented type switcher icons | `<Droplets className="w-3.5 h-3.5" />` / `<AlertTriangle className="w-3.5 h-3.5" />` |
| `components/incidents/IncidentFilters.tsx` | Lines 228–234 (Status dropdown menu) | `🚨 Detected (Unverified)`<br>`✓ Verified`<br>`📋 Assigned`<br>`⚡ In Progress`<br>`🔍 Re-inspection`<br>`✅ Closed`<br>`✕ Rejected (False Pos)` | Status select options | Standardized typography with colored status dots / clean SVG status markers:<br>• `Detected (Unverified)`<br>• `Verified`<br>• `Assigned`<br>• `In Progress`<br>• `Re-inspection`<br>• `Closed & Resolved`<br>• `Rejected (False Pos)` |
| `components/detail/IncidentDetailDrawer.tsx` | Line 54 (Header type badge) | `🌊 Waterlogging` / `⚠️ Pothole` | Header type badge | `<Droplets className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400 inline" /> Waterlogging` / `<AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400 inline" /> Pothole` |
| `components/detail/EvidenceViewer.tsx` | Line 340 (Frame footer scrub bar) | `🌊 Water Extent: 78%` / `⚠️ Depth: ~18cm` | Sensor detection summary | `<Droplets className="w-3.5 h-3.5 inline text-teal-400 mr-1" /> Water Extent: 78%` / `<AlertTriangle className="w-3.5 h-3.5 inline text-amber-400 mr-1" /> Depth: ~18cm` |
| `components/detail/VerificationBar.tsx` | Lines 133 & 144 (Action buttons) | `<span>✓ Verify Incident</span>`<br>`<span>✕ Reject (False Positive)</span>` | Button action text with unicode symbols | `<CheckCircle2 className="w-4 h-4 mr-1.5" /> Verify Incident`<br>`<XCircle className="w-4 h-4 mr-1.5" /> Reject (False Positive)` |
| `components/overview/RecentAlertsFeed.tsx` | Line 71 (Feed item type icon box) | `🌊` / `⚠️` | Feed item thumbnail icon | `<Droplets className="w-4 h-4" />` / `<AlertTriangle className="w-4 h-4" />` |
| `components/overview/OverviewTab.tsx` | Line 70 (Velocity card label) | `↓ 38% vs. manual inspection` | Trend indicator | `<TrendingDown className="w-3.5 h-3.5 inline mr-1 text-emerald-300" /> 38% vs. manual inspection` |
| `components/analytics/AnalyticsDashboard.tsx` | Line 60 (Chart trend tooltip) | `📅 {label}` | Date tooltip header | `<Calendar className="w-3.5 h-3.5 inline text-slate-400 mr-1.5" /> {label}` |
| `components/ingestion/DroneIngestionStudio.tsx` | Line 228 (Preset footage picker) | `🌊` / `⚠️` / `🟢` | Sample preset footage icon | `<Droplets className="w-5 h-5 text-teal-600 dark:text-teal-400" />`<br>`<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />`<br>`<ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />` |
| `components/ingestion/DroneIngestionStudio.tsx` | Lines 506–509 (Inference result card) | `🌊` / `⚠️` / `✅` | Classification result icon | `<Droplets className="w-6 h-6 text-teal-600" />`<br>`<AlertTriangle className="w-6 h-6 text-red-600" />`<br>`<CheckCircle2 className="w-6 h-6 text-emerald-600" />` |
| `components/map/IncidentMapView.tsx` | Line 378 (Custom target GPS pin) | `🎯` | Target GPS marker | `<Crosshair className="w-4 h-4 text-white" />` |
| `components/map/IncidentMapView.tsx` | Line 417 (Map marker pin capsule) | `🌊` / `⚠️` | Map marker pin icon | `<Droplets className="w-3.5 h-3.5 text-white" />` / `<AlertTriangle className="w-3.5 h-3.5 text-white" />` |

---

## 2. Typography System Architecture & Token Standardization

| Element Type | Previous Scale | New Scale Target | Font Weight & Style | Component Implementation |
| --- | --- | --- | --- | --- |
| **Page Title / Hero** | `text-xl` / `text-2xl` | `text-2xl` to `text-4xl` (24–36px) | `font-black tracking-tight` | `OverviewTab`, `Navbar`, `DroneIngestionStudio`, `AnalyticsDashboard` |
| **Section Title** | `text-sm` / `text-base` | `text-lg` to `text-xl` (18–20px) | `font-bold tracking-tight` | All section headers across tabs |
| **Card Code / ID** | `text-sm` (14px) | `text-base` to `text-lg` (16–18px) | `font-mono font-black` | `IncidentCard`, `RecentAlertsFeed`, `IncidentDetailDrawer` |
| **Card Title / Location** | `text-xs` (12px) | `text-sm` to `text-base` (14–16px) | `font-semibold text-zinc-900 dark:text-zinc-100` | `IncidentCard`, `RecentAlertsFeed` |
| **Primary Body Text** | `text-xs` / `text-sm` (12–14px) | `text-sm` to `text-base` (14–16px) | `font-medium leading-relaxed` | Descriptions, modals, cards |
| **Secondary Metadata** | `text-[10px]` / `text-[11px]` | `text-xs` to `text-sm` (12–14px) | `font-mono font-medium` | Telemetry tags, timestamps, zone codes |
| **Action Buttons** | `text-xs` (12px) | `text-xs` to `text-sm` (13–15px) | `font-bold / font-semibold` | Filter pills, inspect buttons, dispatch buttons |
| **Status / Priority Badges** | `text-[10px]` / `text-xs` | `text-xs` (12–13px) | `font-bold tracking-tight` | `PriorityBadge`, `StatusBadge` |
| **KPI Values** | `text-2xl` (24px) | `text-3xl` to `text-4xl` (28–36px) | `font-mono font-black` | `KpiSummaryGrid`, `AnalyticsDashboard` |
| **KPI Labels** | `text-xs` (12px) | `text-xs` to `text-sm` (13–14px) | `font-bold` | `KpiSummaryGrid`, `AnalyticsDashboard` |
| **Map Labels & HUD** | `text-[10px]` / `text-[11px]` | `text-xs` to `text-sm` (12–14px) | `font-mono font-bold` | `IncidentMapView`, `MiniMapWidget` |

---

## 3. Icon Consistency System

- **Metadata / In-line Icon**: 14–16px (`w-3.5 h-3.5` / `w-4 h-4`)
- **Button Icon**: 16–18px (`w-4 h-4` / `w-4.5 h-4.5`)
- **Section Heading Icon**: 18–20px (`w-4.5 h-4.5` / `w-5 h-5`)
- **Page / Hero Icon**: 20–24px (`w-5 h-5` / `w-6 h-6`)
- **Stroke Weight**: Standardized crisp 2px Lucide SVG vector rendering.
