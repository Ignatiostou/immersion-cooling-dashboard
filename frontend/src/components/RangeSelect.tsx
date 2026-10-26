import type { Range } from "../types";
import { RANGES, RANGE_ORDER } from "../config/ranges";
import ToolbarDropdown from "./ToolbarDropdown";

interface RangeSelectProps {
  value: Range;
  onChange: (range: Range) => void;
}

export default function RangeSelect({ value, onChange }: RangeSelectProps) {
  return (
    <ToolbarDropdown
      value={value}
      onChange={onChange}
      options={RANGE_ORDER.map((r) => ({
        value: r,
        label: RANGES[r].label,
        hint: RANGES[r].defaultEvery,
      }))}
      buttonContent={
        <>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-70"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {RANGES[value].label}
        </>
      }
      header="Quick ranges"
      footer="Right column = default point interval"
    />
  );
}
