import { memo, useEffect, useRef } from "react";
import { useLiveTick } from "../api";
import type { MetricKey } from "../types";
import { useTank } from "../context/TankContext";
import { glowBar, uiClass } from "../theme";
import { useOnScreen } from "../hooks/useOnScreen";
import Gauge, { type GaugeHandle } from "./Gauge";

interface GaugePanelProps {
  title: string;
  unit: string;
  color: string;
  gaugeMin: number;
  gaugeMax: number;
  seed: number | null;
  metricKey: MetricKey;
  decimals?: number;
}

function GaugePanel({
  title,
  unit,
  color,
  gaugeMin,
  gaugeMax,
  seed,
  metricKey,
  decimals = 2,
}: GaugePanelProps) {
  const gaugeRef = useRef<GaugeHandle>(null);
  const tickedRef = useRef(false);
  const { serial } = useTank();
  const boxRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(boxRef);
  const onScreenRef = useRef(onScreen);
  onScreenRef.current = onScreen;
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!onScreen || pendingRef.current == null) return;
    gaugeRef.current?.setValue(pendingRef.current);
    pendingRef.current = null;
  }, [onScreen]);

  useEffect(() => {
    tickedRef.current = false;
  }, [serial]);

  useEffect(() => {
    if (seed !== null && !tickedRef.current) gaugeRef.current?.setValue(seed);
  }, [seed]);

  useLiveTick((tick) => {

    const reading = tick.values[metricKey];
    if (!reading) return;
    tickedRef.current = true;

    if (!onScreenRef.current) {
      pendingRef.current = reading.value;
      return;
    }
    gaugeRef.current?.setValue(reading.value);
  }, serial);

  return (
    <div ref={boxRef} className={`${uiClass.panel} h-full flex flex-col justify-center`}>
      <div className="absolute inset-x-0 top-0 h-[2px]" style={glowBar(color)} />
      <Gauge ref={gaugeRef} min={gaugeMin} max={gaugeMax} color={color} unit={unit} decimals={decimals} />
      <div className={uiClass.gaugeTitle}>{title}</div>
    </div>
  );
}

export default memo(GaugePanel);
