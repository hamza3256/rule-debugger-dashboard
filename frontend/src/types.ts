export interface RuleInfo {
  rule_id: string;
  name: string;
  description: string;
  action: string;
  severity: string;
}

export interface Transaction {
  transaction_id: string;
  txn_date_time: string;
  sender_account_id: string;
  receiver_account_id: number | null;
  amount: number;
  currency: string;
  transaction_type: string;
  terminal_id: number | null;
  merchant_city: string | null;
  merchant_country: string | null;
  merchant_postcode: string | null;
  merchant_description_condensed: string | null;
}

export interface FeatureVector {
  transaction_id: string;
  sender_account_id: string;
  receiver_account_id: number | null;
  amount: number;
  currency: string;
  transaction_type: string;
  transaction_count: number;
  avg_transaction_amount: number;
  hour_of_day: number;
  day_of_week: number;
  merchant_avg_transaction_amount: number;
}

export interface EvalStep {
  name: string;
  field: string;
  operator: string;
  threshold: unknown;
  actual: unknown;
  passed: boolean;
}

export interface EvalTrace {
  rule_id: string;
  rule_name: string;
  transaction_id: string;
  fired: boolean;
  steps: EvalStep[];
}

export interface PaginatedTransactions {
  total: number;
  offset: number;
  limit: number;
  items: Transaction[];
}

export interface RuleStats {
  rule_id: string;
  rule_name: string;
  total_transactions: number;
  fired_count: number;
  not_fired_count: number;
  fire_rate: number;
  severity: string;
  action: string;
}

export interface RuleDefaults {
  rule_id: string;
  params: Record<string, unknown>;
}

export interface RuleWithStats extends RuleInfo {
  rule_name: string;
  total_transactions: number;
  fired_count: number;
  not_fired_count: number;
  fire_rate: number;
}
