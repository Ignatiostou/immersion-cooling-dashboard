import ToolbarDropdown from "./ToolbarDropdown";

interface TankSelectProps {
  /** Tanks currently on the page — each gets its own dashboard section. */
  selected: string[];
  options: string[];
  onToggle: (serial: string) => void;
}

export default function TankSelect({ selected, options, onToggle }: TankSelectProps) {
  return (
    <ToolbarDropdown
      selectedValues={selected}
      onChange={onToggle}
      options={options.map((serial) => ({
        value: serial,
        label: serial,
        hint: selected.includes(serial) ? "✓" : undefined,
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
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M4 13c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2" />
          </svg>
          {selected.length === 1 ? selected[0] : `${selected.length} tanks`}
        </>
      }
      header="Tanks"
      footer="Pick as many as you want to watch at once"
      menuWidthClassName="w-72"
    />
  );
}
