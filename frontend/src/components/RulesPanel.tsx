import { useState } from "react";
import type { RuleWithStats } from "../types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function severityVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  switch (s.toLowerCase()) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    default:
      return "secondary";
  }
}

interface Props {
  rules: RuleWithStats[];
  isLoading: boolean;
  selectedRuleId: string | null;
  onSelect: (id: string) => void;
}

export default function RulesPanel({ rules, isLoading, selectedRuleId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = rules.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.rule_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-[300px] min-w-[300px] border-r overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rules ({rules.length})
        </h2>
      </div>

      <div className="px-3 py-2 border-b shrink-0">
        <Input
          type="text"
          placeholder="Search rules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground text-sm">
            <span className="inline-block size-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            Loading rules...
          </div>
        )}
        {filtered.map((rule) => (
          <div
            key={rule.rule_id}
            className={cn(
              "px-4 py-3 cursor-pointer border-b transition-colors",
              selectedRuleId === rule.rule_id
                ? "bg-accent border-l-[3px] border-l-primary"
                : "hover:bg-accent/50"
            )}
            onClick={() => onSelect(rule.rule_id)}
          >
            <div className="font-medium text-sm mb-1">{rule.name}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{rule.description}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant={severityVariant(rule.severity)} className="text-[10px] px-2 py-0">
                {rule.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                {rule.action}
              </Badge>
              {rule.fire_rate !== undefined && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-2 py-0"
                  title={`${rule.fired_count.toLocaleString()} / ${rule.total_transactions.toLocaleString()} fired`}
                >
                  {(rule.fire_rate * 100).toFixed(1)}% fire rate
                </Badge>
              )}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
