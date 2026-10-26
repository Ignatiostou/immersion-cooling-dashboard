
export const COLORS = {
  bg: "#05070a",
  panel: "#0d131b",
  panelBorder: "rgba(255,255,255,0.07)",
  text: "#edf2f7",
  subtext: "#8b98a5",
  muted: "#5f6b78",
  blue: "#60a5fa",
  green: "#4ade80",
  purple: "#c084fc",
  orange: "#fb923c",
  amber: "#fbbf24",
  yellow: "#fde047",
  red: "#f87171",
  teal: "#5eead4",
};

export const darkTooltip = {
  backgroundColor: "#141b24",
  borderColor: COLORS.panelBorder,
  textStyle: { color: COLORS.text, fontSize: 12 },
};


export const uiClass = {
  panel:
    "relative rounded-xl border border-white/10 bg-panel/80 backdrop-blur-sm p-5 shadow-lg shadow-black/30 overflow-hidden",
  sectionTitle:
    "flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-subtext mt-9 mb-3",
  statsRow: "grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-2.5 mt-1 text-center",
  footerStats: "grid grid-cols-4 gap-3 border-t border-white/10 pt-3 mt-3",
  statLabel: "block text-[10px] font-medium uppercase tracking-wider text-muted",
  statValue: "text-sm font-semibold text-text",
  gaugeTitle: "text-center text-[15px] font-medium text-text/90 -mt-1.5",
  panelHeader: "flex items-start justify-between mb-2",
  panelHeading: "text-[15px] font-semibold text-text",
  panelSubtitle: "text-xs text-muted mt-0.5",
  rangeToggle: "inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1",
  rangeButton: "px-3 py-1 rounded-md text-xs font-medium transition-colors",
  rangeButtonActive: "bg-white/10 text-white",
  rangeButtonInactive: "text-subtext hover:text-text",
  legendRow: "flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-subtext",
};

export function glowBar(color: string) {
  return {
    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
    boxShadow: `0 0 14px ${color}`,
  };
}
