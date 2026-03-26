Security & Auditability in Quorum

##The AI Database Problem

AI agents are making decisions at scale. In most systems today, you cannot answer any of the following questions:

* What exactly did the agent decide, and when?
* What reasoning led to that decision?
* Did the agent's reasoning change between iterations — and if so, how?
* Were two agents' conclusions independent, or did one contaminate the other?
* Can this result be reproduced, verified, or challenged?

These are not edge-case questions. They are the basic requirements of any system that produces recommendations with real-world consequences. Policy analysis. Infrastructure planning. Resource allocation. Healthcare decisions.

The standard answer from the AI industry is to show you a chat log. But a chat log is not an audit trail. It can be edited, lacks cryptographic integrity, and captures only the output, not the reasoning chain. It also disappears when the session ends.

Quorum is built on a different premise: every agent decision should be as auditable as a git commit.

---

What Dolt Makes Possible

Dolt is a MySQL-compatible database with Git's version control model built in. In Quorum, this means:

Every agent decision is a commit.

On every iteration of a deliberation, each agent's reasoning is written to its branch and committed with a message derived from the decision itself:

scientist (iter 3): increase social investment in community food networks
engineer (iter 7): mandate imperfect produce standard, phase in over 24 months
urban_ecologist (iter 5): close nutrient loops at foodshed scale


This is not a log. It is a cryptographically chained commit history. Each commit references its parent. The full chain — from iteration 0 to iteration 10 — is immutable once pushed.

Every agent is isolated on its own branch.

main
├── agent/scientist-01abc123
├── agent/engineer-02def456
└── agent/urban_ecologist-03ghi789


Agents cannot read each other's branches during deliberation. They cannot influence each other's commit history. Their reasoning chains are provably independent. If two agents converge on the same answer, you can verify that neither had access to the other's branch when it got there.

Every deliberation is pushed to a public remote.

After each tick, both the agent branch and main are pushed to DoltHub. This means:

* The deliberation history exists outside the application server
* It cannot be retroactively altered by the application
* Anyone with the DoltHub link can inspect the full commit trail independently of Quorum itself

---

What Auditability Actually Means Here

1. You can prove what an agent decided

Every agent_scores row stores the decision text and full reasoning. Every row is committed to a Dolt branch with a commit hash. That hash is:

* Derived from the content of the commit
* Chained to the previous commit
* Pushed to DoltHub

If you have the commit hash, you can verify the content has not changed. This is the same guarantee git provides for source code — applied to agent reasoning.

2. You can reconstruct the full reasoning chain

The commit history on an agent's branch is the deliberation transcript. Not a summary. Not a final answer. The full sequence of what the agent believed at iteration 1, iteration 2, through iteration 10 — including the social score, planetary score, decision text, and reasoning at each step.

SELECT iteration, social_score, planetary_score, decision, reasoning
FROM agent_scores
WHERE agent_id = ?
ORDER BY iteration ASC

This query, run against the agent's Dolt branch, returns a complete, ordered account of how that agent's position evolved. You can see exactly where it changed direction, what caused the shift, and what tradeoffs it was navigating.

3. You can diff two agents at the same point in time

Dolt's diff capability lets you compare any two branches at any commit. In Quorum, this means:

* Compare how the Scientist and the Engineer reasoned about the same problem at iteration 5
* Identify the exact row-level divergence in their agent_scores at that point
* See whether one agent's score trajectory influenced the other — or whether their convergence was genuinely independent

This is not possible in any conventional multi-agent system. It requires a database that understands branching and history as first-class concepts.

4. Results are independently verifiable

A Quorum result is not a number on a screen. It is a DoltHub link. Anyone can:

* Navigate to the DoltHub repository for that deliberation
* Inspect the commit history on any agent's branch
* Verify the scores, decisions, and reasoning at each iteration
* Confirm that the final scores match the commit history

A journalist can publish a Quorum result and include the DoltHub link as the citation. An editor can verify it. A reader can challenge it. The evidence chain is public, persistent, and independent of the Quorum application.

---

Why This Matters for Agent Security

The security problem with AI agents is not primarily about malicious actors. It is about undetectable drift.

An agent that gradually shifts its recommendations across iterations, sessions, or deployments without any auditable record is a governance failure waiting to happen. You cannot detect the drift, prove it occurred, or hold anyone accountable.

Quorum's architecture makes drift auditable by design:

* Iteration-level commits mean any change in an agent's reasoning between ticks is recorded and timestamped
* Branch isolation means no agent can be retroactively blamed for influence it didn't have
* Immutable remote history means the record cannot be altered after the fact, even by the application owner
* Public DoltHub push means the audit trail exists independently of any single party's infrastructure

This is a small prototype. But it demonstrates a concrete technical approach to a problem the AI industry is largely ignoring: how do you make agent reasoning inspectable, reproducible, and defensible at the infrastructure level, not just the application level?

---

The Broader Implication

Most AI governance proposals focus on policy: disclosure requirements, impact assessments, and human-in-the-loop mandates. These are necessary. They are not sufficient.

Policy without infrastructure is an aspiration. The infrastructure question is: what does an auditable AI system actually look like, at the database level?

Quorum's answer is: it looks like a system where every agent decision is a commit, every reasoning chain is a branch, every deliberation is a push to a public remote, and every result can be independently verified by anyone with a browser.

Dolt makes this possible today, with a MySQL-compatible driver, in a two-day prototype.

The question is whether the industry builds toward this — or continues shipping chat logs and calling them audit trails.
