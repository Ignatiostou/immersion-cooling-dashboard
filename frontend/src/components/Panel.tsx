import type { ReactNode } from "react";
import { glowBar, uiClass } from "../theme";

interface PanelProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  glow?: string;
  className?: string;
  error?: string | null;
  children: ReactNode;
}


export default function Panel({
  title,
  subtitle,
  right,
  glow,
  className,
  error,
  children,
}: PanelProps) {
  return (
    <div className={`${uiClass.panel}${className ? ` ${className}` : ""}`}>
      {glow && <div className="absolute inset-x-0 top-0 h-[2px]" style={glowBar(glow)} />}
      <div className={uiClass.panelHeader}>
        <div>
          <h3 className={uiClass.panelHeading}>{title}</h3>
          {subtitle && <div className={uiClass.panelSubtitle}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
          {error}
        </div>
      )}
      {children}
    </div>
  );
}
