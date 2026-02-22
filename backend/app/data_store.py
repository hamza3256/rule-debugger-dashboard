"""
Loads transactions.json & feature_vectors.json once at import time,
sanitises NaN → None, and builds in-memory indexes for fast lookups.
"""

from __future__ import annotations

import json
import math
import os
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.environ.get(
    "DATA_DIR",
    Path(__file__).resolve().parent.parent.parent,  # repo root
))


def _load_json_with_nan(path: Path) -> list[dict]:
    """Read JSON that may contain bare NaN literals (Python-style)."""
    text = path.read_text(encoding="utf-8")
    # Python's json decoder chokes on NaN; use a custom parse_constant.
    return json.loads(text, parse_constant=lambda c: None)


def _sanitise(record: dict) -> dict:
    """Replace any remaining float NaN / Inf with None."""
    out: dict[str, Any] = {}
    for k, v in record.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            out[k] = None
        else:
            out[k] = v
    return out


# ---------------------------------------------------------------------------
# Load & index
# ---------------------------------------------------------------------------

_transactions_raw = _load_json_with_nan(DATA_DIR / "transactions.json")
_features_raw = _load_json_with_nan(DATA_DIR / "feature_vectors.json")
_rules_raw: list[dict] = json.loads(
    (DATA_DIR / "example_rules.json").read_text(encoding="utf-8")
)

TRANSACTIONS: list[dict] = [_sanitise(t) for t in _transactions_raw]
FEATURES: list[dict] = [_sanitise(f) for f in _features_raw]
RULES: list[dict] = _rules_raw

# Primary indexes
TXN_BY_ID: dict[str, dict] = {t["transaction_id"]: t for t in TRANSACTIONS}
FEAT_BY_TXN_ID: dict[str, dict] = {f["transaction_id"]: f for f in FEATURES}

# Per-sender indexes
TXNS_BY_SENDER: dict[str, list[dict]] = defaultdict(list)
for _t in TRANSACTIONS:
    TXNS_BY_SENDER[_t["sender_account_id"]].append(_t)

# Pre-sorted by datetime for each sender
for _sender_txns in TXNS_BY_SENDER.values():
    _sender_txns.sort(key=lambda t: t["txn_date_time"])


# ---------------------------------------------------------------------------
# Sender profiles (computed once)
# ---------------------------------------------------------------------------

class SenderProfile:
    __slots__ = ("sender_id", "modal_country", "type_freq", "txn_count")

    def __init__(self, sender_id: str, txns: list[dict]):
        self.sender_id = sender_id
        countries = [t["merchant_country"] for t in txns if t.get("merchant_country")]
        self.modal_country: str | None = (
            Counter(countries).most_common(1)[0][0] if countries else None
        )
        types = [t["transaction_type"] for t in txns if t.get("transaction_type")]
        total = len(types)
        self.type_freq: dict[str, float] = (
            {typ: cnt / total for typ, cnt in Counter(types).items()} if total else {}
        )
        self.txn_count = len(txns)


SENDER_PROFILES: dict[str, SenderProfile] = {
    sid: SenderProfile(sid, txns) for sid, txns in TXNS_BY_SENDER.items()
}

# Compute dataset-wide amount percentiles for sensible defaults
_all_amounts = sorted(t["amount"] for t in TRANSACTIONS)
AMOUNT_P95 = _all_amounts[int(len(_all_amounts) * 0.95)] if _all_amounts else 500.0
AMOUNT_P50 = _all_amounts[int(len(_all_amounts) * 0.50)] if _all_amounts else 50.0
