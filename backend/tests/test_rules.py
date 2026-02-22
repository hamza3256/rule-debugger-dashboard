"""Unit tests for the rule evaluation engine."""

import pytest

from app.rules import evaluate, get_defaults, RULE_DEFAULTS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_TXN_HIGH = {
    "transaction_id": "TXN_TEST_HIGH",
    "txn_date_time": "2024-10-01 14:00:00",
    "sender_account_id": "sender-aaa",
    "receiver_account_id": 1234567890.0,
    "amount": 5000.0,
    "currency": "USD",
    "transaction_type": "online",
    "terminal_id": 0.0,
    "merchant_city": "New York",
    "merchant_country": "USA",
    "merchant_postcode": None,
    "merchant_description_condensed": "Big Purchase",
}

SAMPLE_TXN_LOW = {
    "transaction_id": "TXN_TEST_LOW",
    "txn_date_time": "2024-10-01 10:00:00",
    "sender_account_id": "sender-bbb",
    "receiver_account_id": 9876543210.0,
    "amount": 5.0,
    "currency": "USD",
    "transaction_type": "online",
    "terminal_id": 0.0,
    "merchant_city": "Austin",
    "merchant_country": "USA",
    "merchant_postcode": None,
    "merchant_description_condensed": "Coffee Shop",
}

SAMPLE_FEAT_HIGH = {
    "transaction_id": "TXN_TEST_HIGH",
    "sender_account_id": "sender-aaa",
    "receiver_account_id": 1234567890.0,
    "amount": 5000.0,
    "currency": "USD",
    "transaction_type": "online",
    "transaction_count": 2,
    "avg_transaction_amount": 2500.0,
    "hour_of_day": 14,
    "day_of_week": 1,
    "merchant_avg_transaction_amount": 5000.0,
}

SAMPLE_FEAT_LOW = {
    "transaction_id": "TXN_TEST_LOW",
    "sender_account_id": "sender-bbb",
    "receiver_account_id": 9876543210.0,
    "amount": 5.0,
    "currency": "USD",
    "transaction_type": "online",
    "transaction_count": 1,
    "avg_transaction_amount": 5.0,
    "hour_of_day": 10,
    "day_of_week": 1,
    "merchant_avg_transaction_amount": 5.0,
}


def _inject_test_data(txn, feat):
    """Temporarily inject test data into the in-memory stores."""
    from app.data_store import TXN_BY_ID, FEAT_BY_TXN_ID
    tid = txn["transaction_id"]
    TXN_BY_ID[tid] = txn
    if feat:
        FEAT_BY_TXN_ID[tid] = feat


def _cleanup_test_data(*txn_ids):
    from app.data_store import TXN_BY_ID, FEAT_BY_TXN_ID
    for tid in txn_ids:
        TXN_BY_ID.pop(tid, None)
        FEAT_BY_TXN_ID.pop(tid, None)


@pytest.fixture(autouse=True)
def setup_teardown():
    _inject_test_data(SAMPLE_TXN_HIGH, SAMPLE_FEAT_HIGH)
    _inject_test_data(SAMPLE_TXN_LOW, SAMPLE_FEAT_LOW)
    yield
    _cleanup_test_data("TXN_TEST_HIGH", "TXN_TEST_LOW")


# ---------------------------------------------------------------------------
# RULE_001: High Value Transaction
# ---------------------------------------------------------------------------

class TestRule001:
    def test_fires_above_threshold(self):
        trace = evaluate("RULE_001", "TXN_TEST_HIGH", {"amount_threshold": 1000})
        assert trace.fired is True
        assert trace.steps[0].passed is True

    def test_does_not_fire_below_threshold(self):
        trace = evaluate("RULE_001", "TXN_TEST_LOW", {"amount_threshold": 1000})
        assert trace.fired is False
        assert trace.steps[0].passed is False

    def test_boundary_equal_does_not_fire(self):
        trace = evaluate("RULE_001", "TXN_TEST_HIGH", {"amount_threshold": 5000})
        assert trace.fired is False

    def test_override_lowers_threshold(self):
        trace = evaluate("RULE_001", "TXN_TEST_LOW", {"amount_threshold": 1})
        assert trace.fired is True


# ---------------------------------------------------------------------------
# RULE_002: Multiple Small Transactions
# ---------------------------------------------------------------------------

class TestRule002:
    def test_fires_when_count_high_and_avg_low(self):
        trace = evaluate("RULE_002", "TXN_TEST_LOW", {
            "count_threshold": 1,
            "small_amount_threshold": 10,
        })
        assert trace.fired is True

    def test_does_not_fire_when_avg_too_high(self):
        trace = evaluate("RULE_002", "TXN_TEST_HIGH", {
            "count_threshold": 1,
            "small_amount_threshold": 10,
        })
        assert trace.fired is False

    def test_does_not_fire_when_count_too_low(self):
        trace = evaluate("RULE_002", "TXN_TEST_LOW", {
            "count_threshold": 100,
            "small_amount_threshold": 1000,
        })
        assert trace.fired is False


# ---------------------------------------------------------------------------
# RULE_006: Outside Normal Hours
# ---------------------------------------------------------------------------

class TestRule006:
    def test_fires_outside_hours(self):
        trace = evaluate("RULE_006", "TXN_TEST_HIGH", {"start_hour": 15, "end_hour": 22})
        assert trace.fired is True

    def test_does_not_fire_within_hours(self):
        trace = evaluate("RULE_006", "TXN_TEST_HIGH", {"start_hour": 8, "end_hour": 22})
        assert trace.fired is False


# ---------------------------------------------------------------------------
# RULE_007: Large Cash Withdrawal
# ---------------------------------------------------------------------------

class TestRule007:
    def test_does_not_fire_for_online(self):
        trace = evaluate("RULE_007", "TXN_TEST_HIGH", {
            "cash_like_types": ["chip_and_pin"],
            "cash_amount_threshold": 100,
        })
        assert trace.fired is False

    def test_fires_when_type_matches_and_amount_high(self):
        trace = evaluate("RULE_007", "TXN_TEST_HIGH", {
            "cash_like_types": ["online"],
            "cash_amount_threshold": 100,
        })
        assert trace.fired is True


# ---------------------------------------------------------------------------
# General / edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_unknown_rule_raises(self):
        with pytest.raises(ValueError, match="No evaluator"):
            evaluate("RULE_999", "TXN_TEST_HIGH")

    def test_unknown_transaction_raises(self):
        with pytest.raises(ValueError, match="not found"):
            evaluate("RULE_001", "TXN_NONEXISTENT")

    def test_defaults_exist_for_all_rules(self):
        for rule_id in ["RULE_001", "RULE_002", "RULE_003", "RULE_004", "RULE_005", "RULE_006", "RULE_007"]:
            defaults = get_defaults(rule_id)
            assert isinstance(defaults, dict)
            assert len(defaults) > 0

    def test_trace_structure(self):
        trace = evaluate("RULE_001", "TXN_TEST_HIGH")
        assert trace.rule_id == "RULE_001"
        assert trace.transaction_id == "TXN_TEST_HIGH"
        assert isinstance(trace.steps, list)
        assert len(trace.steps) > 0
        step = trace.steps[0]
        assert hasattr(step, "name")
        assert hasattr(step, "field")
        assert hasattr(step, "operator")
        assert hasattr(step, "threshold")
        assert hasattr(step, "actual")
        assert hasattr(step, "passed")
