import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchEvalTrace, fetchFeatures, fetchRuleDefaults, fetchTransaction } from "../api";
import type { RuleInfo } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import TraceSummary from "./TraceSummary";
import ThresholdOverrides from "./ThresholdOverrides";
import StepCard from "./StepCard";
import TransactionDetail from "./TransactionDetail";
import FeatureDisplay from "./FeatureDisplay";

interface Props {
  selectedRule: RuleInfo | null;
  selectedTxnId: string | null;
}

export default function TracePanel({ selectedRule, selectedTxnId }: Props) {
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  const [stepThrough, setStepThrough] = useState(false);
  const [visibleStep, setVisibleStep] = useState(0);

  const overridesJson =
    Object.keys(overrides).length > 0 ? JSON.stringify(overrides) : undefined;

  const traceEnabled = !!selectedRule && !!selectedTxnId;

  const { data: trace, isLoading: traceLoading } = useQuery({
    queryKey: ["evaluate", selectedRule?.rule_id, selectedTxnId, overridesJson],
    queryFn: () => fetchEvalTrace(selectedRule!.rule_id, selectedTxnId!, overridesJson),
    enabled: traceEnabled,
    placeholderData: keepPreviousData,
  });

  const { data: features } = useQuery({
    queryKey: ["features", selectedTxnId],
    queryFn: () => fetchFeatures(selectedTxnId!),
    enabled: !!selectedTxnId,
  });

  const { data: txnDetail } = useQuery({
    queryKey: ["transaction", selectedTxnId],
    queryFn: () => fetchTransaction(selectedTxnId!),
    enabled: !!selectedTxnId,
  });

  const { data: defaults } = useQuery({
    queryKey: ["rule_defaults", selectedRule?.rule_id],
    queryFn: () => fetchRuleDefaults(selectedRule!.rule_id),
    enabled: !!selectedRule,
  });

  const totalSteps = trace?.steps.length ?? 0;

  // Empty state: nothing selected
  if (!selectedRule && !selectedTxnId) {
    return (
      <div className="flex flex-col w-[420px] min-w-[420px] overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-card border-b shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Debug Trace
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="text-muted-foreground">
            <div className="text-3xl mb-3 opacity-40">&#x1F50D;</div>
            <p className="text-sm font-medium mb-1">No selection</p>
            <p className="text-xs">Select a rule and a transaction to see the evaluation trace</p>
          </div>
        </div>
      </div>
    );
  }

  // Transaction selected but no rule
  if (!selectedRule && selectedTxnId) {
    return (
      <div className="flex flex-col w-[420px] min-w-[420px] overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-card border-b shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transaction Detail
          </h2>
        </div>
        <ScrollArea className="flex-1">
          {txnDetail && <TransactionDetail txn={txnDetail} />}
          {features && <FeatureDisplay features={features} />}
          {!txnDetail && !features && (
            <div className="flex items-center justify-center p-8 text-center text-muted-foreground text-sm">
              Select a rule to evaluate this transaction
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Rule selected but no transaction
  if (!selectedTxnId) {
    return (
      <div className="flex flex-col w-[420px] min-w-[420px] overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-card border-b shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Debug Trace
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="text-muted-foreground">
            <div className="text-3xl mb-3 opacity-40">&#x2190;</div>
            <p className="text-sm font-medium mb-1">Pick a transaction</p>
            <p className="text-xs">
              Select a transaction to see how <span className="font-semibold text-foreground">{selectedRule!.name}</span> evaluates
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full trace view
  return (
    <div className="flex flex-col w-[420px] min-w-[420px] overflow-hidden">
      <div className="flex items-center px-4 py-3 bg-card border-b shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Debug Trace
        </h2>
      </div>
      <ScrollArea className="flex-1">
        {traceLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground text-sm">
            <span className="inline-block size-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            Evaluating...
          </div>
        ) : trace ? (
          <>
            <TraceSummary trace={trace} rule={selectedRule!} />

            {defaults && (
              <ThresholdOverrides
                defaults={defaults}
                overrides={overrides}
                onChange={setOverrides}
              />
            )}

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step-by-Step Evaluation
                </h3>
                {totalSteps > 1 && (
                  <Button
                    variant={stepThrough ? "default" : "outline"}
                    size="xs"
                    onClick={() => {
                      setStepThrough(!stepThrough);
                      setVisibleStep(0);
                    }}
                  >
                    {stepThrough ? "Show All" : "Step Through"}
                  </Button>
                )}
              </div>

              {stepThrough ? (
                <div className="space-y-3">
                  <StepCard
                    step={trace.steps[visibleStep]}
                    index={visibleStep}
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={visibleStep === 0}
                      onClick={() => setVisibleStep((v) => v - 1)}
                    >
                      Prev Step
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Step {visibleStep + 1} of {totalSteps}
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={visibleStep >= totalSteps - 1}
                      onClick={() => setVisibleStep((v) => v + 1)}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {trace.steps.map((step, i) => (
                    <StepCard key={i} step={step} index={i} />
                  ))}
                </div>
              )}
            </div>

            {txnDetail && <TransactionDetail txn={txnDetail} />}
            {features && <FeatureDisplay features={features} />}
          </>
        ) : null}
      </ScrollArea>
    </div>
  );
}
