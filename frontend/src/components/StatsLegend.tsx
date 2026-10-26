import { forwardRef, useImperativeHandle, useRef } from "react";
import { COLORS } from "../theme";

export interface StatsLegendRow {
  label: string;
  color: string;
  dashed?: boolean;

  unit?: string;
}

export interface StatsLegendValues {
  min: number | null;
  max: number | null;
  mean: number | null;
  last: number | null;
}

export interface StatsLegendHandle {
  update: (values: (StatsLegendValues | null)[]) => void;
}

interface StatsLegendProps {
  rows: StatsLegendRow[];
  unit: string;
  hiddenLabels?: ReadonlySet<string>;
  onToggle?: (label: string) => void;
}

const STAT_KEYS = ["min", "max", "mean", "last"] as const;
const HEADERS = ["Min", "Max", "Mean", "Last"];
const GRID_COLUMNS = "minmax(0,1fr) repeat(4, minmax(72px, auto))";


const StatsLegend = forwardRef<StatsLegendHandle, StatsLegendProps>(function StatsLegend(
  { rows, unit, hiddenLabels, onToggle },
  ref
) {
  const cellRefs = useRef<(HTMLSpanElement | null)[][]>([]);

  useImperativeHandle(
    ref,
    () => ({
      update: (values) => {
        rows.forEach((row, i) => {
          const v = values[i];
          const rowUnit = row.unit ?? unit;
          STAT_KEYS.forEach((key, j) => {
            const el = cellRefs.current[i]?.[j];
            if (el) el.textContent = v && v[key] != null ? `${v[key]!.toFixed(2)} ${rowUnit}` : "—";
          });
        });
      },
    }),
    [rows, unit]
  );

  return (
    <div className="border-t border-white/10 pt-2 mt-3">
      <div className="grid items-center gap-x-4 py-1 text-[11px] font-medium" style={{ gridTemplateColumns: GRID_COLUMNS, color: COLORS.blue }}>
        <span>Name</span>
        {HEADERS.map((h) => (
          <span key={h} className="text-right">
            {h}
          </span>
        ))}
      </div>
      {rows.map((row, i) => {
        const toggleable = !!onToggle && !row.dashed;
        const hidden = hiddenLabels?.has(row.label) ?? false;
        return (
        <div
          key={row.label}
          className={`grid items-center gap-x-4 border-t border-white/5 py-1 text-xs transition-opacity${
            toggleable ? " cursor-pointer select-none hover:bg-white/[0.04]" : ""
          }${hidden ? " opacity-35" : ""}`}
          style={{ gridTemplateColumns: GRID_COLUMNS }}
          onClick={toggleable ? () => onToggle(row.label) : undefined}
          title={toggleable ? (hidden ? "Show series" : "Hide series") : undefined}
        >
          <span className="flex min-w-0 items-center gap-2 text-subtext">
            <span
              aria-hidden
              className="w-4 shrink-0"
              style={
                row.dashed
                  ? { borderTop: `2px dashed ${row.color}` }
                  : { borderTop: `3px solid ${row.color}`, borderRadius: 2 }
              }
            />
            <span className="truncate">{row.label}</span>
          </span>
          {STAT_KEYS.map((key, j) => (
            <span
              key={key}
              ref={(el) => {
                (cellRefs.current[i] ??= [])[j] = el;
              }}
              className={`text-right font-medium${key === "last" ? " font-semibold" : " text-text"}`}
              style={key === "last" ? { color: row.color } : undefined}
            >
              &mdash;
            </span>
          ))}
        </div>
        );
      })}
    </div>
  );
});

export default StatsLegend;
