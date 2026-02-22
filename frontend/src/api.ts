import type {
  EvalTrace,
  FeatureVector,
  PaginatedTransactions,
  RuleDefaults,
  RuleInfo,
  RuleStats,
  RuleWithStats,
  Transaction,
} from "./types";

const BASE = "/api";

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const fetchRules = () => get<RuleInfo[]>(`${BASE}/rules`);

export const fetchRulesWithStats = () =>
  get<RuleWithStats[]>(`${BASE}/rules_with_stats`);

export const fetchTransaction = (txnId: string) =>
  get<Transaction>(`${BASE}/transactions/${txnId}`);

export const fetchRuleDefaults = (ruleId: string) =>
  get<RuleDefaults>(`${BASE}/rules/${ruleId}/defaults`);

export const fetchTransactions = (params: Record<string, string>) =>
  get<PaginatedTransactions>(`${BASE}/transactions`, params);

export const fetchFeatures = (txnId: string) =>
  get<FeatureVector>(`${BASE}/transactions/${txnId}/features`);

export const fetchEvalTrace = (ruleId: string, txnId: string, overrides?: string) =>
  get<EvalTrace>(`${BASE}/evaluate`, {
    rule_id: ruleId,
    transaction_id: txnId,
    ...(overrides ? { overrides } : {}),
  });

export const fetchRuleStats = (ruleId: string) =>
  get<RuleStats>(`${BASE}/rule_stats`, { rule_id: ruleId });

export interface FilterOptions {
  countries: string[];
  transaction_types: string[];
  currencies: string[];
  max_amount: number;
}

export const fetchFilterOptions = () =>
  get<FilterOptions>(`${BASE}/filter_options`);
