import { useEffect, useMemo, useRef, useState } from "react";
import echarts, { EChartsView as ReactECharts } from "../charts/echarts";
import { fetchStatusTimeline, useLiveTick } from "../api";
import type { StatusSegment, StatusTimeline } from "../types";
import { uiClass } from "../theme";
import Panel from "./Panel";
import { useRange } from "../context/RangeContext";
import { useTank } from "../context/TankContext";
import { useChartAutoResize, useOnScreen } from "../hooks/useOnScreen";
import {
  SIGNAL_ORDER,
  LEGEND_ITEMS,
  colorForState,
  buildTimelineOption,
} from "../charts/timeline";

const MAX_SEGMENTS = 300;


const MIN_STATE_HOLD_MS = 5 * 1000;

export default function UnitStatusPanel() {
  const { range, refreshToken, tanksLoaded } = useRange();
  const { serial } = useTank();
  const chartRef = useRef<ReactECharts>(null);
  const seededRef = useRef(false);
  const segsRef = useRef<Record<string, StatusSegment[]>>({});
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(boxRef);
  useChartAutoResize(boxRef, chartRef);
  const onScreenRef = useRef(onScreen);
  onScreenRef.current = onScreen;

  const staleViewRef = useRef(false);

  const option = useMemo(() => buildTimelineOption(), []);

  const repaint = () => {
    const data: [number, number, number, string][] = [];
    SIGNAL_ORDER.forEach((signal, idx) => {
      for (const seg of segsRef.current[signal] ?? []) data.push([idx, seg.start, seg.end, seg.state]);
    });
    chartRef.current?.getEchartsInstance()?.setOption({ series: [{ data }] });
  };


  useEffect(() => {
    if (!tanksLoaded) return;
    const controller = new AbortController();
    let cancelled = false;
    seededRef.current = false;
    fetchStatusTimeline(range, serial, controller.signal)
      .then((data: StatusTimeline[]) => {
        if (cancelled) return;
        setError(null);
        const seeded: Record<string, StatusSegment[]> = {};
        for (const t of data) seeded[t.signal] = t.segments.slice(-MAX_SEGMENTS);
        segsRef.current = seeded;
        seededRef.current = true;
        repaint();
      })
      .catch(() => {
        if (cancelled) return;
        seededRef.current = true;
        setError("Couldn't load the status timeline — live updates will still appear.");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };

  }, [range, refreshToken, serial, tanksLoaded]);

  useLiveTick((tick) => {
    if (!seededRef.current) return;
    const statusMap: Record<string, string> = {
      "Global Alarm Status": tick.status.globalAlarm,
      "Pump Alarm Status": tick.status.pumpAlarm,
      "Unit Status": tick.status.unitStatus,
      "Compressor Status": tick.status.compressorStatus,
      "Condenser Fans Status": tick.status.condenserFans,
      "Pump 1 Status": tick.status.pump1Status,
      "Pump 2 Status": tick.status.pump2Status,
      "Pump 1 Mode": tick.status.pump1Mode,
      "Pump 2 Mode": tick.status.pump2Mode,
      "Coolant Point Level": tick.status.coolantPointLevel,
    };

    for (const signal of SIGNAL_ORDER) {
      const segs = segsRef.current[signal] ?? (segsRef.current[signal] = []);
      const newState = statusMap[signal];
      const lastSeg = segs[segs.length - 1];
      if (!lastSeg) {
        segs.push({ start: tick.timestamp, end: tick.timestamp, state: newState });
      } else if (lastSeg.state === newState || tick.timestamp - lastSeg.start < MIN_STATE_HOLD_MS) {
        lastSeg.end = tick.timestamp;
      } else {
        segs.push({ start: lastSeg.end, end: tick.timestamp, state: newState });
        if (segs.length > MAX_SEGMENTS) segs.splice(0, segs.length - MAX_SEGMENTS);
      }
    }
    // Off screen: segments stay current, the redraw waits.
    if (!onScreenRef.current) {
      staleViewRef.current = true;
      return;
    }
    repaint();
  }, serial);

  useEffect(() => {
    if (!onScreen) return;
    // A container laid out at zero size leaves the chart sized to nothing.
    chartRef.current?.getEchartsInstance()?.resize();
    if (!staleViewRef.current) return;
    staleViewRef.current = false;
    repaint();
  }, [onScreen]);

  return (
    <Panel title="Unit Status" error={error}>
      <div ref={boxRef} style={{ height: 300 }}>
        <ReactECharts
          echarts={echarts}
          ref={chartRef}
          option={option}
          style={{ height: "100%", width: "100%" }}
          lazyUpdate
        />
      </div>
      <div className={`${uiClass.legendRow} mt-3 border-t border-white/10 pt-3`}>
        {LEGEND_ITEMS.map(({ label, state }) => {
          const color = colorForState(state);
          return (
            <span key={label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-4 rounded"
                style={{ background: `${color}26`, border: `1px solid ${color}` }}
              />
              {label}
            </span>
          );
        })}
      </div>
    </Panel>
  );
}
