import { useCallback, useEffect, useRef, useState } from "react";
import type { RuleDefaults } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  defaults: RuleDefaults;
  overrides: Record<string, unknown>;
  onChange: (o: Record<string, unknown>) => void;
}

const DEBOUNCE_MS = 400;

function toDisplayString(val: unknown): string {
  if (Array.isArray(val)) return val.join(", ");
  return String(val ?? "");
}

function parseValue(raw: string, defaultVal: unknown): unknown {
  let parsed: unknown = raw;
  if (typeof defaultVal === "number") {
    const n = Number(raw);
    if (!isNaN(n)) parsed = n;
  } else if (Array.isArray(defaultVal)) {
    parsed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return parsed;
}

export default function ThresholdOverrides({ defaults, overrides, onChange }: Props) {
  const params = defaults.params;
  const keys = Object.keys(params);
  const hasOverrides = Object.keys(overrides).length > 0;

  const buildDraft = useCallback(() => {
    const d: Record<string, string> = {};
    for (const key of Object.keys(params)) {
      const val = overrides[key] ?? params[key];
      d[key] = toDisplayString(val);
    }
    return d;
  }, [params, overrides]);

  const [draft, setDraft] = useState<Record<string, string>>(buildDraft);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setDraft(buildDraft());
  }, [buildDraft]);

  const handleInput = (key: string, raw: string) => {
    setDraft((prev) => ({ ...prev, [key]: raw }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const defaultVal = params[key];
      if (raw === "" || raw === String(defaultVal)) {
        const next = { ...overrides };
        delete next[key];
        onChangeRef.current(next);
      } else {
        onChangeRef.current({ ...overrides, [key]: parseValue(raw, defaultVal) });
      }
    }, DEBOUNCE_MS);
  };

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange({});
  };

  return (
    <div className="p-4 border-b bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Threshold Parameters
        </h3>
        {hasOverrides && (
          <Button variant="outline" size="xs" onClick={handleReset}>
            Reset to defaults
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {keys.map((key) => {
          const defaultVal = params[key];
          const isOverridden = key in overrides;
          return (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {key.replace(/_/g, " ")}
              </span>
              <Input
                type="text"
                value={draft[key] ?? toDisplayString(defaultVal)}
                onChange={(e) => handleInput(key, e.target.value)}
                className={cn(
                  "h-8 text-sm font-mono",
                  isOverridden && "border-primary bg-primary/5"
                )}
              />
              {isOverridden && (
                <span className="text-[10px] text-muted-foreground italic">
                  default: {toDisplayString(defaultVal)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
