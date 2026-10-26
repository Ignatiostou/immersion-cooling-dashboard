import type { ReactNode } from "react";
import { useConnected } from "./api";
import type { Snapshot } from "./types";
import type { ChartSeriesSpec } from "./charts/types";
import { COLORS, uiClass } from "./theme";
import { RangeProvider, useRange } from "./context/RangeContext";
import { TankProvider, useTank } from "./context/TankContext";
import { formatBucket } from "./config/ranges";
import GaugePanel from "./components/GaugePanel";
import ChartPanel from "./components/ChartPanel";
import RangeSelect from "./components/RangeSelect";
import RefreshControl from "./components/RefreshControl";
import TankSelect from "./components/TankSelect";
import UnitStatusPanel from "./components/UnitStatusPanel";
import {
  COOLANT_GAUGES,
  WATER_GAUGES,
  COOLANT_TEMP_SERIES,
  COOLANT_FLOW_SERIES,
  WATER_TEMP_SERIES,
  WATER_FLOW_SERIES,
  HEAT_SERIES,
  HEAT_GAUGE_PANEL,
  COOLANT_SETPOINT,
  tankHasMetric,
  type GaugePanelSpec,
} from "./config/dashboard.config";

function SectionTitle({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className={uiClass.sectionTitle}>
      <span className="h-[9px] w-[9px] rounded-full border-2" style={{ borderColor: color }} />
      {children}
    </div>
  );
}


function ChartRow({
  gauges,
  seedFor,
  children,
}: {
  gauges: GaugePanelSpec[];
  seedFor: (key: keyof Snapshot) => number | null;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 sm:flex-row lg:h-full lg:flex-col">
        {gauges.map((g) => (
          <div key={g.key} className="min-w-0 flex-1">
            <GaugePanel
              title={g.title}
              unit={g.unit}
              color={g.color}
              gaugeMin={g.gaugeMin}
              gaugeMax={g.gaugeMax}
              seed={seedFor(g.key)}
              metricKey={g.metricKey}
              decimals={g.decimals}
            />
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </div>
  );
}


function RangeToolbar() {
  const { range, setRange, pointEveryMs, selected, serials, toggleSerial } = useRange();
  return (
    <div className="sticky top-0 z-30 -mx-5 mb-1 mt-6 border-b border-white/5 bg-[#0b0f14]/85 px-5 py-2.5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text">
            Time range
          </span>
          <span className="hidden text-xs text-text sm:inline">
            all charts · new live point every {formatBucket(pointEveryMs)}
          </span>
        </div>
        <div className="flex items-stretch divide-x divide-white/10 overflow-visible rounded-lg border border-white/10 bg-black/40">
          {serials.length > 1 && (
            <TankSelect selected={selected} options={serials} onToggle={toggleSerial} />
          )}
          <RangeSelect value={range} onChange={setRange} />
          <RefreshControl />
        </div>
      </div>
    </div>
  );
}


interface DashboardRow {
  gauges: GaugePanelSpec[];
  series: ChartSeriesSpec[];
  panel: {
    title: string;
    unit: string;
    height: number;
    secondaryUnit?: string;
    yScale?: boolean;
    accent?: string;
    glow?: string;
    setpoint?: number;
    setpointRow?: string;
  };
}

interface DashboardSection {
  color: string;
  title: string;
  rows: DashboardRow[];
  /** Extra content gated on a metric key rather than a chart/gauge pair. */
  extra?: { requires: string; node: ReactNode };
}

const SECTIONS: DashboardSection[] = [
  {
    color: COLORS.green,
    title: "Coolant System",
    rows: [
      {
        gauges: COOLANT_GAUGES.filter((g) => g.key !== "coolantFlow"),
        series: COOLANT_TEMP_SERIES,
        panel: {
          title: "Coolant Input + Output — Timeseries",
          unit: "°C",
          height: 300,
          accent: COLORS.teal,
          setpoint: COOLANT_SETPOINT,
          setpointRow: "Setpoint",
        },
      },
      {
        gauges: COOLANT_GAUGES.filter((g) => g.key === "coolantFlow"),
        series: COOLANT_FLOW_SERIES,
        panel: { title: "Coolant Flow — Timeseries", unit: "m³/h", height: 220 },
      },
    ],
  },
  {
    color: COLORS.blue,
    title: "Water System",
    rows: [
      {
        gauges: WATER_GAUGES.filter((g) => g.key !== "waterFlow"),
        series: WATER_TEMP_SERIES,
        panel: { title: "Water Input + Output — Timeseries", unit: "°C", height: 260, yScale: true },
      },
      {
        gauges: WATER_GAUGES.filter((g) => g.key === "waterFlow"),
        series: WATER_FLOW_SERIES,
        panel: { title: "Water Flow — Timeseries", unit: "m³/h", height: 220 },
      },
    ],
  },
  {
    color: COLORS.orange,
    title: "Heat Dissipation & Unit Status",
    rows: [
      {
        gauges: [HEAT_GAUGE_PANEL],
        series: HEAT_SERIES,
        panel: { title: "Heat Dissipation", unit: "kW", secondaryUnit: "°C", height: 250, glow: COLORS.orange },
      },
    ],
    extra: { requires: "unitStatus", node: <UnitStatusPanel /> },
  },
];

function TankDashboard() {
  const { serial, metrics, snapshot, snapshotError } = useTank();
  const { tanksLoaded } = useRange();

  const has = (metric?: string) => tankHasMetric(metrics, metric);
  const seedFor = (key: keyof Snapshot): number | null =>
    snapshot ? snapshot[key] : null;

  return (
    <div>
      {serial && (
        <div className="mb-3 mt-8 flex items-baseline gap-3 border-t border-white/10 pt-5 first:mt-0">
          <h2 className="text-base font-semibold tracking-tight text-text">{serial}</h2>
          <span className="text-xs text-muted">Tank</span>
        </div>
      )}

      {snapshotError && (
        <div className="mb-5 rounded-lg border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          Couldn't load the initial snapshot ({snapshotError}). Live values will still appear once the socket connects. Use Refresh to retry the snapshot.
        </div>
      )}

      {tanksLoaded && !metrics.length && (
        <div className="mb-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-text">
          This tank isn't reporting any known metrics yet.
        </div>
      )}

      {SECTIONS.map((section) => {
        const rows = section.rows.map((row) => ({
          gauges: row.gauges.filter((g) => has(g.metricKey)),
          series: row.series.filter((s) => has(s.metric)),
          panel: row.panel,
        }));
        const extraVisible = !!section.extra && metrics.includes(section.extra.requires);
        const visible = rows.some((r) => r.gauges.length || r.series.length) || extraVisible;
        if (!visible) return null;

        return (
          <div key={section.title}>
            <SectionTitle color={section.color}>{section.title}</SectionTitle>
            <div className="flex flex-col gap-4">
              {rows.map((row, i) =>
                (row.gauges.length || row.series.length) > 0 ? (
                  <ChartRow key={i} gauges={row.gauges} seedFor={seedFor}>
                    {row.series.length > 0 && <ChartPanel series={row.series} {...row.panel} />}
                  </ChartRow>
                ) : null
              )}
              {extraVisible && section.extra!.node}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function Dashboard() {
  const connected = useConnected();
  const { selected, metricsFor } = useRange();

  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-16 pt-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Immersion Cooling Dashboard
        </h1>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            connected
              ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
              : "border-accent-red/40 bg-accent-red/10 text-accent-red"
          }`}
        >
          {connected ? "● LIVE" : "○ CONNECTING…"}
        </span>
      </div>

      {/* ── Global range: one control for every tank and chart below ─────── */}
      <RangeToolbar />

      {/* One section per selected tank. Each fetches its own history and
          snapshot; the live socket already carries every tank, so adding one
          here costs no extra InfluxDB polling. */}
      {selected.map((serial) => (
        <TankProvider key={serial} serial={serial} metrics={metricsFor(serial)}>
          <TankDashboard />
        </TankProvider>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <RangeProvider>
      <Dashboard />
    </RangeProvider>
  );
}
