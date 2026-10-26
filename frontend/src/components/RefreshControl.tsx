import { useRange } from "../context/RangeContext";
import { POINT_INTERVALS, type PointInterval } from "../config/refresh";
import { RANGES, intervalFitsRange } from "../config/ranges";
import ToolbarDropdown, { type DropdownOption } from "./ToolbarDropdown";

type IntervalChoice = PointInterval | "auto";


export default function RefreshControl() {
  const { range, pointInterval, setPointInterval } = useRange();


  const intervalOptions: readonly DropdownOption<IntervalChoice>[] = [
    { value: "auto", label: "Auto", hint: RANGES[range].defaultEvery },
    ...POINT_INTERVALS.filter((i) => intervalFitsRange(i, range)).map((i) => ({
      value: i,
      label: i,
    })),
  ];

  return (
    <ToolbarDropdown
      value={pointInterval ?? "auto"}
      onChange={(v) => setPointInterval(v === "auto" ? null : v)}
      options={intervalOptions}
      buttonContent={pointInterval ?? "Auto"}
      header="New point every"
      menuWidthClassName="w-36"
    />
  );
}
