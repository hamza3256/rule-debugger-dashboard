import type { RuleInfo } from "../types";
import { Badge } from "@/components/ui/badge";

interface Props {
  trace: { fired: boolean; transaction_id: string; rule_id: string };
  rule: RuleInfo;
}

export default function TraceSummary({ trace, rule }: Props) {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center gap-3 mb-3">
        <Badge
          variant={trace.fired ? "destructive" : "secondary"}
          className="text-sm px-3 py-1"
        >
          {trace.fired ? "RULE FIRED" : "RULE DID NOT FIRE"}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>
          <span className="font-semibold text-foreground">Rule:</span> {rule.name}{" "}
          <span className="text-muted-foreground">({trace.rule_id})</span>
        </div>
        <div>
          <span className="font-semibold text-foreground">Transaction:</span>{" "}
          <span className="font-mono">{trace.transaction_id}</span>
        </div>
        <div>
          <span className="font-semibold text-foreground">Action:</span> {rule.action}
          <span className="mx-1.5 text-muted-foreground">&middot;</span>
          <span className="font-semibold text-foreground">Severity:</span> {rule.severity}
        </div>
      </div>
    </div>
  );
}
