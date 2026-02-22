from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class RuleInfo(BaseModel):
    rule_id: str
    name: str
    description: str
    action: str
    severity: str


class TransactionOut(BaseModel):
    transaction_id: str
    txn_date_time: str
    sender_account_id: str
    receiver_account_id: Optional[float] = None
    amount: float
    currency: str
    transaction_type: str
    terminal_id: Optional[float] = None
    merchant_city: Optional[str] = None
    merchant_country: Optional[str] = None
    merchant_postcode: Optional[str] = None
    merchant_description_condensed: Optional[str] = None


class FeatureVectorOut(BaseModel):
    transaction_id: str
    sender_account_id: str
    receiver_account_id: Optional[float] = None
    amount: float
    currency: str
    transaction_type: str
    transaction_count: int
    avg_transaction_amount: float
    hour_of_day: int
    day_of_week: int
    merchant_avg_transaction_amount: float


class EvalStep(BaseModel):
    name: str
    field: str
    operator: str
    threshold: Any
    actual: Any
    passed: bool


class EvalTrace(BaseModel):
    rule_id: str
    rule_name: str
    transaction_id: str
    fired: bool
    steps: list[EvalStep]


class PaginatedTransactions(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[TransactionOut]


class RuleStats(BaseModel):
    rule_id: str
    rule_name: str
    total_transactions: int
    fired_count: int
    not_fired_count: int
    fire_rate: float
    severity: str
    action: str


class RuleDefaults(BaseModel):
    rule_id: str
    params: dict[str, Any]
