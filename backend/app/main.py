from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .data_store import (
    AMOUNT_P95,
    FEAT_BY_TXN_ID,
    RULES,
    TRANSACTIONS,
    TXN_BY_ID,
)
from .rules import (
    RULE_DEFAULTS,
    evaluate,
    get_all_rules_with_stats,
    get_rule_stats,
    is_fired,
)
from .schemas import (
    EvalTrace,
    FeatureVectorOut,
    PaginatedTransactions,
    RuleDefaults,
    RuleInfo,
    RuleStats,
    TransactionOut,
)

# Pre-computed filter option lists (computed once)
_DISTINCT_COUNTRIES: list[str] = sorted({
    t["merchant_country"] for t in TRANSACTIONS if t.get("merchant_country")
})
_DISTINCT_TYPES: list[str] = sorted({
    t["transaction_type"] for t in TRANSACTIONS if t.get("transaction_type")
})
_DISTINCT_CURRENCIES: list[str] = sorted({
    t["currency"] for t in TRANSACTIONS if t.get("currency")
})

app = FastAPI(title="Rule Debugging API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Rules ─────────────────────────────────────────────────────────────────

@app.get("/api/rules", response_model=list[RuleInfo])
def list_rules():
    return RULES


@app.get("/api/rules_with_stats")
def rules_with_stats():
    """All rules enriched with precomputed fire-rate stats (single request)."""
    return get_all_rules_with_stats()


@app.get("/api/rules/{rule_id}/defaults", response_model=RuleDefaults)
def rule_defaults(rule_id: str):
    if rule_id not in RULE_DEFAULTS:
        raise HTTPException(404, f"No defaults for {rule_id}")
    return RuleDefaults(rule_id=rule_id, params=RULE_DEFAULTS[rule_id])


# ── Filter Options ────────────────────────────────────────────────────────

@app.get("/api/filter_options")
def filter_options():
    return {
        "countries": _DISTINCT_COUNTRIES,
        "transaction_types": _DISTINCT_TYPES,
        "currencies": _DISTINCT_CURRENCIES,
        "max_amount": AMOUNT_P95 * 2,
    }


# ── Transactions ──────────────────────────────────────────────────────────

@app.get("/api/transactions", response_model=PaginatedTransactions)
def list_transactions(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    sender_account_id: Optional[str] = None,
    merchant_country: Optional[str] = None,
    transaction_type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    query: Optional[str] = None,
    rule_id: Optional[str] = None,
    fired: Optional[bool] = None,
):
    items = TRANSACTIONS

    if sender_account_id:
        items = [t for t in items if t["sender_account_id"] == sender_account_id]
    if merchant_country:
        items = [t for t in items if t.get("merchant_country") == merchant_country]
    if transaction_type:
        items = [t for t in items if t.get("transaction_type") == transaction_type]
    if min_amount is not None:
        items = [t for t in items if t["amount"] >= min_amount]
    if max_amount is not None:
        items = [t for t in items if t["amount"] <= max_amount]
    if query:
        q = query.lower()
        items = [
            t for t in items
            if q in t["transaction_id"].lower()
            or q in (t.get("merchant_description_condensed") or "").lower()
            or q in (t.get("merchant_city") or "").lower()
            or q in t["sender_account_id"].lower()
        ]

    if rule_id and fired is not None:
        items = [
            t for t in items
            if is_fired(rule_id, t["transaction_id"]) == fired
        ]

    total = len(items)
    page = items[offset: offset + limit]
    return PaginatedTransactions(total=total, offset=offset, limit=limit, items=page)


@app.get("/api/transactions/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: str):
    txn = TXN_BY_ID.get(transaction_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    return txn


@app.get("/api/transactions/{transaction_id}/features", response_model=FeatureVectorOut)
def get_features(transaction_id: str):
    feat = FEAT_BY_TXN_ID.get(transaction_id)
    if not feat:
        raise HTTPException(404, "Feature vector not found")
    return feat


# ── Evaluation ────────────────────────────────────────────────────────────

@app.get("/api/evaluate", response_model=EvalTrace)
def evaluate_rule(
    rule_id: str = Query(...),
    transaction_id: str = Query(...),
    overrides: Optional[str] = Query(None, description="JSON-encoded param overrides"),
):
    parsed_overrides: dict[str, Any] | None = None
    if overrides:
        try:
            parsed_overrides = json.loads(overrides)
        except json.JSONDecodeError:
            raise HTTPException(400, "overrides must be valid JSON")
    try:
        return evaluate(rule_id, transaction_id, parsed_overrides)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except (TypeError, KeyError) as exc:
        raise HTTPException(400, f"Invalid override parameters: {exc}")


@app.get("/api/rule_stats", response_model=RuleStats)
def rule_stats(rule_id: str = Query(...)):
    stats = get_rule_stats(rule_id)
    if stats is None:
        raise HTTPException(404, "Rule not found")
    return stats
