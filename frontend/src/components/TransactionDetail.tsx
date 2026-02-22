import type { Transaction } from "../types";
import { formatValue } from "@/lib/format";

interface Props {
  txn: Transaction;
}

export default function TransactionDetail({ txn }: Props) {
  const fields: [string, unknown][] = [
    ["transaction_id", txn.transaction_id],
    ["date_time", txn.txn_date_time],
    ["amount", txn.amount],
    ["currency", txn.currency],
    ["transaction_type", txn.transaction_type],
    ["merchant", txn.merchant_description_condensed],
    ["merchant_city", txn.merchant_city],
    ["merchant_country", txn.merchant_country],
    ["sender", txn.sender_account_id],
    ["receiver", txn.receiver_account_id],
  ];

  return (
    <div className="p-4 border-t">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Transaction Data
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {fields.map(([key, val]) => (
          <div key={key} className="flex flex-col p-2 bg-card rounded-md border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {String(key).replace(/_/g, " ")}
            </span>
            <span className="text-xs font-mono break-all">
              {formatValue(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
