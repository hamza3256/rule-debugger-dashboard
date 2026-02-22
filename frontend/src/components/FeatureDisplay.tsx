import type { FeatureVector } from "../types";
import { formatValue } from "@/lib/format";

interface Props {
  features: FeatureVector;
}

const DERIVED_KEYS = [
  "transaction_count",
  "avg_transaction_amount",
  "hour_of_day",
  "day_of_week",
  "merchant_avg_transaction_amount",
];
const BASE_KEYS = ["amount", "currency", "transaction_type"];

export default function FeatureDisplay({ features }: Props) {
  return (
    <div className="p-4 border-t">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Feature Vector
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {[...BASE_KEYS, ...DERIVED_KEYS].map((key) => {
          const val = (features as unknown as Record<string, unknown>)[key];
          if (val === undefined) return null;
          return (
            <div key={key} className="flex flex-col p-2 bg-card rounded-md border">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {key.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-mono break-all">
                {formatValue(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
