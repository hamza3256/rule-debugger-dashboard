# Take-Home Assignment: Rule Debugging UI

## Task Description

Your task is to develop a **User Interface (UI)** that facilitates the understanding and debugging of a set of predefined rules. The UI should visually represent how transactions and features interact with these rules, making it easy to identify why a rule might or might not be firing as expected. The primary goal is to create a tool that allows users to intuitively debug and comprehend the logic of the rules.

## Candidate Expectations

We expect candidates to:
- **Design and implement an intuitive and functional UI.**
- **Utilize the provided JSON files as data sources** for the UI.
- **Demonstrate clear, well-structured, and maintainable code** for the UI.
- **Provide a brief explanation** of your approach, the technologies used, and any design decisions made.
- **Consider user experience and clarity** in the UI's presentation of rule logic.
- **The solution should be runnable** and presentable.
- **Using AI to assist in the creation of this dashboard is appropriate and encouraged.**

You will be asked to present this UI as part of the second phase of the interview. During this presentation, you will be asked questions about how you made the dashboard and how it fulfills the job of enabling people to debug their rules. You will also be expected to make some small changes to the UI during the interview to demonstrate your understanding of your creation.

## How to Use the Provided JSON Files

You will be provided with three JSON files that serve as data inputs for your UI:

1.  **`transactions.json`**:
    *   This file contains an array of raw transaction objects. Each object represents a single financial transaction with various attributes (e.g., `id`, `amount`, `description`, `date`).
    *   **Your role**: This data should be accessible and potentially filterable or displayable within your UI to show how individual transactions are affected by the rules.

2.  **`feature_vectors.json`**:
    *   This file contains pre-generated feature vectors derived from transactions. These features might be used as inputs for the rules.
    *   **Your role**: Your UI should be able to display and link these feature vectors to the corresponding transactions and rules, helping to visualize the data points that rules operate on.

3.  **`example_rules.json`**:
    *   This file contains a set of rules that your UI should help debug. These rules will likely define conditions based on transaction attributes or feature vectors.
    *   **Your role**: The core functionality of your UI should revolve around presenting these rules, allowing users to understand their logic, and ideally, visualize which transactions or feature vectors satisfy or fail to satisfy specific rule conditions. The UI should enable a user to "step through" or inspect how a rule evaluates against specific data.

Good luck!