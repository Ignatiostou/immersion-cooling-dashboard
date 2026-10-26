import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useChartAutoResize } from "../hooks/useOnScreen";
import echarts, { EChartsView as ReactECharts } from "../charts/echarts";
import { buildGaugeOption } from "../charts/gauge";

export interface GaugeHandle {

  setValue: (value: number) => void;
}

interface GaugeProps {
  min: number;
  max: number;
  color: string;
  unit?: string;
  decimals?: number;
  height?: number;
}


const Gauge = forwardRef<GaugeHandle, GaugeProps>(function Gauge(
  { min, max, color, unit, decimals = 2, height = 130 },
  ref
) {
  const chartRef = useRef<ReactECharts>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useChartAutoResize(boxRef, chartRef);
  const option = useMemo(
    () => buildGaugeOption({ min, max, color, unit, decimals }),
    [min, max, color, unit, decimals]
  );

  useImperativeHandle(
    ref,
    () => ({
      setValue: (value: number) =>
        chartRef.current?.getEchartsInstance()?.setOption({ series: [{ data: [{ value }] }] }),
    }),
    []
  );

  return (
    <div ref={boxRef} style={{ height }}>
      <ReactECharts
        echarts={echarts}
        ref={chartRef}
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge={false}
        lazyUpdate
      />
    </div>
  );
});

export default Gauge;
