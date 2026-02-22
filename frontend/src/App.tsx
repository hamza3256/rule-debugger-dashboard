import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRulesWithStats } from "./api";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import RulesPanel from "./components/RulesPanel";
import TransactionsPanel from "./components/TransactionsPanel";
import TracePanel from "./components/TracePanel";

export default function App() {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(() => {
    return !sessionStorage.getItem("help_dismissed");
  });

  const { data: rules, isLoading, isError } = useQuery({
    queryKey: ["rules_with_stats"],
    queryFn: fetchRulesWithStats,
  });

  const selectedRule = rules?.find((r) => r.rule_id === selectedRuleId) ?? null;

  const dismissHelp = () => {
    setShowHelp(false);
    sessionStorage.setItem("help_dismissed", "1");
  };

  return (
    <>
      <header className="flex items-center gap-3 px-6 py-3.5 bg-card border-b shrink-0">
        <h1 className="text-base font-semibold tracking-tight">Rule Debugger</h1>
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm text-muted-foreground">
          Inspect how fraud-detection rules evaluate against transactions
        </span>
        <div className="ml-auto">
          {!showHelp && (
            <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)} className="text-xs text-muted-foreground">
              How to use
            </Button>
          )}
        </div>
      </header>

      {showHelp && (
        <div className="px-6 py-3 bg-primary/5 border-b border-primary/20 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">Getting Started</p>
              <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground text-xs leading-relaxed">
                <li><span className="font-medium text-foreground/80">Pick a rule</span> from the left panel — each shows its severity and fire rate across all transactions</li>
                <li><span className="font-medium text-foreground/80">Select a transaction</span> from the centre table — use search, filters, or the Fired/Not Fired toggle to narrow results</li>
                <li><span className="font-medium text-foreground/80">Read the debug trace</span> on the right — see the FIRED/NOT FIRED verdict, then inspect each condition step by step</li>
                <li><span className="font-medium text-foreground/80">Tweak thresholds</span> in the trace panel to explore "what if" scenarios — changes re-evaluate in real time</li>
                <li>Use <span className="font-medium text-foreground/80">Step Through</span> mode to walk through conditions one at a time</li>
              </ol>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissHelp} className="text-xs text-muted-foreground shrink-0 mt-0.5">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {isError && (
        <div className="px-6 py-2.5 bg-destructive/10 text-destructive text-sm font-medium border-b border-destructive/30 shrink-0">
          Cannot connect to the backend API. Make sure the server is running on port 8000.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <RulesPanel
          rules={rules ?? []}
          isLoading={isLoading}
          selectedRuleId={selectedRuleId}
          onSelect={(id) => {
            setSelectedRuleId(id);
            setSelectedTxnId(null);
          }}
        />
        <TransactionsPanel
          selectedRuleId={selectedRuleId}
          selectedRule={selectedRule}
          selectedTxnId={selectedTxnId}
          onSelectTxn={setSelectedTxnId}
        />
        <TracePanel
          key={selectedRuleId ?? "__none__"}
          selectedRule={selectedRule}
          selectedTxnId={selectedTxnId}
        />
      </div>
    </>
  );
}
