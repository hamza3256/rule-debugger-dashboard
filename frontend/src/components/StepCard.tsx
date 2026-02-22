import type { EvalStep } from "../types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatValue } from "@/lib/format";

interface Props {
  step: EvalStep;
  index: number;
}

export default function StepCard({ step, index }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 bg-card",
        step.passed ? "border-l-[3px] border-l-emerald-500" : "border-l-[3px] border-l-destructive"
      )}
    >
      <div className="flex items-center gap-2 mb-2 font-medium text-sm">
        <span className="text-muted-foreground">#{index + 1}</span>
        <span>{step.name}</span>
        <Badge
          variant={step.passed ? "secondary" : "destructive"}
          className="text-[10px] px-1.5 py-0 ml-auto"
        >
          {step.passed ? "PASS" : "FAIL"}
        </Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">Field</dt>
        <dd className="font-mono break-all">{step.field}</dd>
        <dt className="text-muted-foreground">Condition</dt>
        <dd className="font-mono break-all">
          {step.operator} {formatValue(step.threshold)}
        </dd>
        <dt className="text-muted-foreground">Actual value</dt>
        <dd
          className={cn(
            "font-mono font-semibold break-all",
            step.passed ? "text-emerald-500" : "text-destructive"
          )}
        >
          {formatValue(step.actual)}
        </dd>
      </dl>
    </div>
  );
}

