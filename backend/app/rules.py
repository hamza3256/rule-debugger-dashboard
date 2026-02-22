"""
Rule evaluation engine.

Each rule has:
 - a set of default parameters (thresholds)
 - an evaluate() function that returns an EvalTrace with step-by-step results

Callers can pass `overrides` to tweak thresholds at debug-time.

Stats and fired-transaction sets are precomputed once at module load for the
default parameters, so /api/rules_with_stats and the fired-filter are O(1).
"""

from __future__ import annotations

from typing import Any, Callable

from .data_store import (
    AMOUNT_P50,
    AMOUNT_P95,
    FEAT_BY_TXN_ID,
    RULES,
    SENDER_PROFILES,
    TXN_BY_ID,
)
from .schemas import EvalStep, EvalTrace

# ---------------------------------------------------------------------------
# Default parameters per rule
# ---------------------------------------------------------------------------

RULE_DEFAULTS: dict[str, dict[str, Any]] = {
    "RULE_001": {
        "amount_threshold": round(AMOUNT_P95, 2),
    },
    "RULE_002": {
        "count_threshold": 5,
        "small_amount_threshold": round(AMOUNT_P50, 2),
    },
    "RULE_003": {
        "rare_type_freq_threshold": 0.10,
    },
    "RULE_004": {
        "high_risk_countries": ["PRK", "IRN", "SYR", "CUB", "VEN", "MMR", "AFG", "YEM", "LBY", "SOM"],
    },
    "RULE_005": {
        "cross_border_amount_threshold": round(AMOUNT_P50, 2),
    },
    "RULE_006": {
        "start_hour": 8,
        "end_hour": 22,
    },
    "RULE_007": {
        "cash_like_types": ["chip_and_pin"],
        "cash_amount_threshold": 200.0,
    },
}


def get_defaults(rule_id: str) -> dict[str, Any]:
    return dict(RULE_DEFAULTS.get(rule_id, {}))


def _coerce(value: Any, default: Any) -> Any:
    """Coerce an override value to match the type of the default, or return default on failure."""
    if default is None:
        return value
    if isinstance(default, bool):
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes")
        return bool(value)
    if isinstance(default, int):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return default
    if isinstance(default, float):
        try:
            return float(value)
        except (TypeError, ValueError):
            return default
    if isinstance(default, list):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [s.strip() for s in value.split(",") if s.strip()]
        return default
    return value


def _merged(rule_id: str, overrides: dict[str, Any] | None) -> dict[str, Any]:
    params = get_defaults(rule_id)
    if overrides:
        for key, val in overrides.items():
            if key in params:
                params[key] = _coerce(val, params[key])
    return params


def _rule_meta(rule_id: str) -> dict:
    for r in RULES:
        if r["rule_id"] == rule_id:
            return r
    return {"rule_id": rule_id, "name": rule_id}


# ---------------------------------------------------------------------------
# Individual evaluators
# ---------------------------------------------------------------------------

def _eval_001(txn: dict, feat: dict | None, params: dict) -> list[EvalStep]:
    threshold = params["amount_threshold"]
    amt = txn["amount"]
    return [EvalStep(
        name="Amount exceeds threshold",
        field="amount",
        operator=">",
        threshold=threshold,
        actual=amt,
        passed=amt > threshold,
    )]


def _eval_002(txn: dict, feat: dict | None, params: dict) -> list[EvalStep]:
    steps: list[EvalStep] = []
    count = feat["transaction_count"] if feat else 1
    steps.append(EvalStep(
        name="Transaction count for sender >= threshold",
        field="feature.transaction_count",
        operator=">=",
        threshold=params["count_threshold"],
        actual=count,
        passed=count >= params["count_threshold"],
    ))
    avg = feat["avg_transaction_amount"] if feat else txn["amount"]
    steps.append(EvalStep(
        name="Avg transaction amount is small",
        field="feature.avg_transaction_amount",
        operator="<=",
        threshold=params["small_amount_threshold"],
        actual=avg,
        passed=avg <= params["small_amount_threshold"],
    ))
    return steps


def _eval_003(txn: dict, feat: dict | None, params: dict) -> list[EvalStep]:
    sender_id = txn["sender_account_id"]
    profile = SENDER_PROFILES.get(sender_id)
    txn_type = txn.get("transaction_type", "unknown")
    freq = profile.type_freq.get(txn_type, 0.0) if profile else 0.0
    threshold = params["rare_type_freq_threshold"]
    return [EvalStep(
        name="Transaction type is rare for this sender",
        field="sender_type_frequency",
        operator="<",
        threshold=threshold,
        actual=round(freq, 4),
        passed=freq < threshold,
    )]


def _eval_004(txn: dict, feat: dict | None, params: dict) -> list[EvalStep]:
    country = txn.get("merchant_country")
    high_risk = params["high_risk_countries"]
    return [EvalStep(
        name="Merchant country is high-risk",
        field="merchant_country",
        operator="in",
        threshold=high_risk,
        actual=country,
        passed=(country in high_risk) if country else False,
    )]


def _eval_005(txn: dict, feat: dict | None, params: dict) -> list[EvalStep]:
    steps: list[EvalStep] = []
    sender_id = txn["sender_account_id"]
    profile = SENDER_PROFILES.get(sender_id)
    modal = profile.modal_country if profile else None
    merchant_country = txn.get("merchant_country")
    is_cross = (merchant_country is not None and modal is not None and merchant_country != modal)
    steps.append(EvalStep(
        name="Merchant country differs from sender's modal country",
        field="merchant_country vs sender_modal_country",
        operator="!=",
        threshold=modal,
        actual=merchant_country,
        passed=is_cross,
    ))
    amt = txn["amount"]
    threshold = params["cross_border_amount_threshold"]
    steps.append(EvalStep(
        name="Amount is significant for cross-border",
        field="amount",
        operator=">=",
        threshold=threshold,
        actual=amt,
        passed=amt >= threshold,
    ))
    return steps


def _eval_006(txn: dict, feat: dict | None, params: dict) -> list[EvalStep]:
    hour = feat["hour_of_day"] if feat else 12
    start = params["start_hour"]
    end = params["end_hour"]
    outside = hour < start or hour >= end
    return [EvalStep(
        name="Transaction outside normal hours",
        field="feature.hour_of_day",
        operator="not in",
        threshold=f"[{start}, {end})",
        actual=hour,
        passed=outside,
    )]


def _eval_007(txn: dict, feat: dict | None, params: dict) -> list[EvalStep]:
    steps: list[EvalStep] = []
    txn_type = txn.get("transaction_type", "")
    cash_types = params["cash_like_types"]
    steps.append(EvalStep(
        name="Transaction type is cash-like",
        field="transaction_type",
        operator="in",
        threshold=cash_types,
        actual=txn_type,
        passed=txn_type in cash_types,
    ))
    amt = txn["amount"]
    threshold = params["cash_amount_threshold"]
    steps.append(EvalStep(
        name="Amount exceeds cash withdrawal threshold",
        field="amount",
        operator=">=",
        threshold=threshold,
        actual=amt,
        passed=amt >= threshold,
    ))
    return steps


_EVALUATORS: dict[str, Callable] = {
    "RULE_001": _eval_001,
    "RULE_002": _eval_002,
    "RULE_003": _eval_003,
    "RULE_004": _eval_004,
    "RULE_005": _eval_005,
    "RULE_006": _eval_006,
    "RULE_007": _eval_007,
}


# ---------------------------------------------------------------------------
# Precomputed stats & fired sets (default params only, computed once)
# ---------------------------------------------------------------------------

def _precompute() -> tuple[
    dict[str, dict[str, Any]],   # rule_id -> {fired_count, total, fire_rate}
    dict[str, set[str]],         # rule_id -> set of fired transaction_ids
]:
    stats: dict[str, dict[str, Any]] = {}
    fired_sets: dict[str, set[str]] = {}
    for rule_id, evaluator in _EVALUATORS.items():
        params = get_defaults(rule_id)
        fired_ids: set[str] = set()
        for txn_id, txn in TXN_BY_ID.items():
            feat = FEAT_BY_TXN_ID.get(txn_id)
            steps = evaluator(txn, feat, params)
            if all(s.passed for s in steps):
                fired_ids.add(txn_id)
        total = len(TXN_BY_ID)
        fired_count = len(fired_ids)
        meta = _rule_meta(rule_id)
        stats[rule_id] = {
            "rule_id": rule_id,
            "rule_name": meta.get("name", rule_id),
            "total_transactions": total,
            "fired_count": fired_count,
            "not_fired_count": total - fired_count,
            "fire_rate": round(fired_count / total, 4) if total else 0.0,
            "severity": meta.get("severity", ""),
            "action": meta.get("action", ""),
        }
        fired_sets[rule_id] = fired_ids
    return stats, fired_sets


PRECOMPUTED_STATS, FIRED_SETS = _precompute()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def evaluate(
    rule_id: str,
    transaction_id: str,
    overrides: dict[str, Any] | None = None,
) -> EvalTrace:
    txn = TXN_BY_ID.get(transaction_id)
    if txn is None:
        raise ValueError(f"Transaction {transaction_id} not found")
    feat = FEAT_BY_TXN_ID.get(transaction_id)
    evaluator = _EVALUATORS.get(rule_id)
    if evaluator is None:
        raise ValueError(f"No evaluator for rule {rule_id}")

    params = _merged(rule_id, overrides)
    steps = evaluator(txn, feat, params)
    fired = all(s.passed for s in steps)

    meta = _rule_meta(rule_id)
    return EvalTrace(
        rule_id=rule_id,
        rule_name=meta.get("name", rule_id),
        transaction_id=transaction_id,
        fired=fired,
        steps=steps,
    )


def is_fired(rule_id: str, transaction_id: str) -> bool:
    """Check whether a rule fires for a transaction (uses precomputed set)."""
    fired_set = FIRED_SETS.get(rule_id)
    if fired_set is None:
        return False
    return transaction_id in fired_set


def get_rule_stats(rule_id: str) -> dict[str, Any] | None:
    """Return precomputed stats for a rule."""
    return PRECOMPUTED_STATS.get(rule_id)


def get_all_rules_with_stats() -> list[dict[str, Any]]:
    """Return all rules enriched with precomputed stats."""
    result = []
    for rule in RULES:
        rid = rule["rule_id"]
        stats = PRECOMPUTED_STATS.get(rid, {})
        result.append({**rule, **stats})
    return result
