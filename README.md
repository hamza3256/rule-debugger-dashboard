# Rule Debugging UI

A full-stack dashboard for inspecting and debugging fraud-detection rules against financial transactions. Select a rule, browse transactions, and see a step-by-step evaluation trace that explains exactly why the rule fired (or didn't). Tweak thresholds in real time to explore "what if" scenarios.

## Quick Start

### Option A: Docker (recommended)

```bash
docker compose up --build
```

Open **http://localhost:8000**. The single container builds the React frontend, then serves both the API and the UI from uvicorn. No other dependencies needed.

### Option B: Local development

#### Prerequisites

- **Python 3.10+** with `venv` support
- **Node.js 18+** and npm

#### 1. Start the backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

The API loads `transactions.json`, `feature_vectors.json`, and `example_rules.json` from the repo root on startup (~39k transactions). It sanitises non-standard `NaN` values to `null` and precomputes rule statistics and fired-transaction sets so the UI loads instantly.

#### 2. Start the frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the backend at port 8000.

## How to Use

1. **Pick a rule** in the left panel. Each rule shows its severity, action, and fire rate across all 39k transactions.
2. **Browse transactions** in the centre table. Use the search bar, country/type dropdowns, or the "Fired / Not fired" filter to narrow results.
3. **Click a transaction** to see the **Debug Trace** on the right:
   - A **FIRED / NOT FIRED** verdict with rule metadata
   - **Editable threshold parameters** -- change any value and the trace re-evaluates instantly
   - A **step-by-step breakdown** showing each condition, the operator, the threshold, the actual value, and PASS/FAIL
   - **Step-through mode** -- click "Step Through" to reveal one condition at a time with Prev/Next navigation
   - **Transaction data** and **Feature vector** sections showing all fields the rule operates on
4. **Click a transaction without selecting a rule** to inspect its raw data and feature vector independently.

## Architecture

```
frontend/              React + TypeScript + Vite + Tailwind CSS + shadcn/ui
  src/
    api.ts             API client (fetch wrapper)
    types.ts           Shared TypeScript interfaces
    lib/utils.ts       Tailwind class merge utility (cn)
    components/
      ui/              shadcn/ui primitives (Badge, Button, Card, Input, Select, Table, etc.)
      RulesPanel       Rule list with search, badges, fire rates
      TransactionsPanel Paginated table with filters
      TracePanel       Orchestrates debug trace view + step-through mode
      TraceSummary     Fired/not-fired verdict banner
      ThresholdOverrides Editable rule parameters
      StepCard         Individual evaluation step card
      TransactionDetail Raw transaction data grid
      FeatureDisplay   Feature vector data grid

backend/               Python / FastAPI
  app/
    main.py            Routes & CORS
    data_store.py      Load JSON, sanitise NaN, build indexes, precompute sender profiles
    rules.py           Rule evaluators with precomputed stats + fired sets
    schemas.py         Pydantic response models
```

## Rule Evaluation Logic

The provided `example_rules.json` contains descriptions but not machine-readable conditions. The backend implements an evaluator for each rule based on the description, the transaction schema, and the feature vector fields. **All thresholds are configurable in the UI.**

| Rule | Logic | Default Threshold |
|------|-------|-------------------|
| RULE_001 -- High Value Transaction | `amount > threshold` | Dataset P95 (2,048) |
| RULE_002 -- Multiple Small Txns | `txn_count >= N` AND `avg_amount <= small` | count >= 5, avg <= P50 (15.60) |
| RULE_003 -- Unusual Type for User | Sender's historical type frequency < threshold | freq < 10% |
| RULE_004 -- High-Risk Merchant | `merchant_country` in high-risk set | PRK, IRN, SYR, CUB, VEN, MMR, AFG, YEM, LBY, SOM |
| RULE_005 -- Cross-Border Anomaly | `merchant_country != sender_modal_country` AND `amount >= threshold` | amount >= P50 |
| RULE_006 -- Outside Normal Hours | `hour_of_day` not in [start, end) | [8, 22) |
| RULE_007 -- Large Cash Withdrawal | `txn_type` in cash-like set AND `amount >= threshold` | chip_and_pin, amount >= 200 |

## Running Tests

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

35 tests covering rule evaluator logic (pass/fail cases, boundary conditions, overrides, error handling) and API integration tests (all endpoints, filters, pagination, error responses).

## Technologies

- **Backend:** Python 3, FastAPI, Pydantic, Uvicorn, Pytest
- **Frontend:** React 19, TypeScript, Vite, TanStack Query
- **Styling:** Tailwind CSS v4, shadcn/ui (Radix UI primitives), dark theme
- **Deployment:** Docker (multi-stage build), docker compose

## Design Decisions

- **Backend for data loading:** `transactions.json` contains bare `NaN` literals (non-standard JSON). Python handles this gracefully; a browser's `JSON.parse` would fail.
- **Precomputed stats and fired sets:** Rule stats (fire rate, counts) and per-rule fired-transaction sets are computed once at startup. This means the rules panel loads instantly (one API call instead of seven) and the "Fired / Not fired" filter is O(1) per transaction.
- **Sender profiles:** Modal country and transaction-type frequency distributions are precomputed per sender, enabling rules like "unusual type" and "cross-border anomaly" to reason about user history.
- **Threshold overrides:** The trace panel exposes each rule's parameters as editable inputs. Changing a threshold re-evaluates the rule against the selected transaction in real time via the `/api/evaluate?overrides=...` endpoint. This directly supports the "debug" workflow: "why didn't this rule fire?" -> lower threshold -> see which step now passes.
- **Trace-first debugging:** Every rule returns a list of `EvalStep` objects, each with the field name, operator, threshold, actual value, and pass/fail status. This makes it immediately clear *which* condition failed and what value would need to change.
- **Paginated API + frontend pagination:** With ~39k transactions, we paginate server-side (default 50 per page) to keep responses fast and the DOM lean.
- **Tailwind CSS + shadcn/ui:** Using Tailwind v4 utility classes and shadcn/ui primitives (built on Radix UI) for a consistent, accessible, and maintainable design system. All styling lives in the component files as Tailwind classes -- no separate CSS files to maintain.
- **Component decomposition:** The trace panel is broken into five focused sub-components (TraceSummary, ThresholdOverrides, StepCard, TransactionDetail, FeatureDisplay), each in its own file for readability and easy modification during the interview.
- **Step-through mode:** Rules with multiple conditions offer a "Step Through" toggle that reveals one condition at a time with Prev/Next navigation, directly enabling users to "step through" rule evaluation as the requirements describe.
- **Error handling:** The frontend shows a clear banner when the backend is unreachable, rather than silently rendering empty panels.
