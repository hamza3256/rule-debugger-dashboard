"""Integration tests for API endpoints using FastAPI TestClient."""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestRulesEndpoints:
    def test_list_rules(self):
        res = client.get("/api/rules")
        assert res.status_code == 200
        rules = res.json()
        assert isinstance(rules, list)
        assert len(rules) == 7
        assert rules[0]["rule_id"] == "RULE_001"

    def test_rules_with_stats(self):
        res = client.get("/api/rules_with_stats")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 7
        first = data[0]
        assert "fired_count" in first
        assert "fire_rate" in first
        assert "total_transactions" in first
        assert first["total_transactions"] > 0

    def test_rule_defaults(self):
        res = client.get("/api/rules/RULE_001/defaults")
        assert res.status_code == 200
        data = res.json()
        assert data["rule_id"] == "RULE_001"
        assert "amount_threshold" in data["params"]

    def test_rule_defaults_not_found(self):
        res = client.get("/api/rules/RULE_999/defaults")
        assert res.status_code == 404


class TestTransactionsEndpoints:
    def test_list_transactions_default(self):
        res = client.get("/api/transactions")
        assert res.status_code == 200
        data = res.json()
        assert "total" in data
        assert "items" in data
        assert data["total"] > 0
        assert len(data["items"]) <= 50

    def test_pagination(self):
        res = client.get("/api/transactions?offset=0&limit=5")
        data = res.json()
        assert len(data["items"]) == 5

        res2 = client.get("/api/transactions?offset=5&limit=5")
        data2 = res2.json()
        assert data["items"][0]["transaction_id"] != data2["items"][0]["transaction_id"]

    def test_country_filter(self):
        res = client.get("/api/transactions?merchant_country=BRA&limit=5")
        data = res.json()
        for item in data["items"]:
            assert item["merchant_country"] == "BRA"

    def test_type_filter(self):
        res = client.get("/api/transactions?transaction_type=contactless&limit=5")
        data = res.json()
        for item in data["items"]:
            assert item["transaction_type"] == "contactless"

    def test_search_filter(self):
        res = client.get("/api/transactions?limit=1")
        first_id = res.json()["items"][0]["transaction_id"]
        res2 = client.get(f"/api/transactions?query={first_id}&limit=10")
        data2 = res2.json()
        assert data2["total"] >= 1
        assert any(i["transaction_id"] == first_id for i in data2["items"])

    def test_fired_filter(self):
        res = client.get("/api/transactions?rule_id=RULE_001&fired=true&limit=5")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] > 0

    def test_get_single_transaction(self):
        res = client.get("/api/transactions?limit=1")
        tid = res.json()["items"][0]["transaction_id"]
        res2 = client.get(f"/api/transactions/{tid}")
        assert res2.status_code == 200
        assert res2.json()["transaction_id"] == tid

    def test_get_transaction_not_found(self):
        res = client.get("/api/transactions/TXN_NONEXISTENT")
        assert res.status_code == 404

    def test_get_features(self):
        res = client.get("/api/transactions?limit=1")
        tid = res.json()["items"][0]["transaction_id"]
        res2 = client.get(f"/api/transactions/{tid}/features")
        assert res2.status_code == 200
        feat = res2.json()
        assert feat["transaction_id"] == tid
        assert "hour_of_day" in feat


class TestEvaluateEndpoint:
    def test_evaluate_basic(self):
        res = client.get("/api/transactions?limit=1")
        tid = res.json()["items"][0]["transaction_id"]
        res2 = client.get(f"/api/evaluate?rule_id=RULE_001&transaction_id={tid}")
        assert res2.status_code == 200
        trace = res2.json()
        assert trace["rule_id"] == "RULE_001"
        assert trace["transaction_id"] == tid
        assert isinstance(trace["fired"], bool)
        assert len(trace["steps"]) > 0

    def test_evaluate_with_overrides(self):
        res = client.get("/api/transactions?limit=1")
        tid = res.json()["items"][0]["transaction_id"]
        overrides = json.dumps({"amount_threshold": 0.01})
        res2 = client.get(f"/api/evaluate?rule_id=RULE_001&transaction_id={tid}&overrides={overrides}")
        assert res2.status_code == 200
        assert res2.json()["fired"] is True

    def test_evaluate_invalid_overrides(self):
        res = client.get("/api/transactions?limit=1")
        tid = res.json()["items"][0]["transaction_id"]
        res2 = client.get(f"/api/evaluate?rule_id=RULE_001&transaction_id={tid}&overrides=not_json")
        assert res2.status_code == 400

    def test_evaluate_unknown_rule(self):
        res = client.get("/api/transactions?limit=1")
        tid = res.json()["items"][0]["transaction_id"]
        res2 = client.get(f"/api/evaluate?rule_id=RULE_999&transaction_id={tid}")
        assert res2.status_code == 404


class TestFilterOptions:
    def test_filter_options(self):
        res = client.get("/api/filter_options")
        assert res.status_code == 200
        data = res.json()
        assert "countries" in data
        assert "transaction_types" in data
        assert "currencies" in data
        assert len(data["countries"]) > 0


class TestRuleStats:
    def test_rule_stats(self):
        res = client.get("/api/rule_stats?rule_id=RULE_001")
        assert res.status_code == 200
        data = res.json()
        assert data["rule_id"] == "RULE_001"
        assert data["fired_count"] + data["not_fired_count"] == data["total_transactions"]

    def test_rule_stats_not_found(self):
        res = client.get("/api/rule_stats?rule_id=RULE_999")
        assert res.status_code == 404
