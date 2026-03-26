Why Dolt

Quorum uses Dolt as its database. This document explains why, and how that choice shaped the system.

---

The Problem Dolt Solves

When multiple AI agents reason through the same problem simultaneously, they produce diverging chains of thought. Each agent updates its scores on every tick, and each update depends on the agent’s previous state.

With a conventional database, you have two bad options:

1. One shared table means agents overwrite each other’s reasoning. You see only the final answer, not how it was reached. Diffs between agents at the same iteration are impossible.
2. Separate tables per agent mean you lose relational integrity, queries become difficult, and you still get no commit history.

Dolt gives you a third option: one schema, one branch per agent, and full commit history per tick.

---

How It’s Used in Quorum

One branch per persona

When a game is created, every agent gets its own Dolt branch forked from main:

main
├── agent/scientist-01abc123
├── agent/engineer-02def456
└── agent/urban_ecologist-03ghi789

Each branch starts from the same committed state: the game row, the agent rows, and the baseline scores. From there, they diverge independently.

Every tick is a commit

On each of the 10 iterations, the tick route writes the agent’s new score and reasoning to its branch and then commits:

CALL DOLT_ADD('.');
CALL DOLT_COMMIT('-m', 'scientist (iter 3): increase social investment');

The commit message is the agent’s actual decision, so the git log is the deliberation transcript.

Main mirrors the full council

The same score is also written to main after each tick. This lets the dashboard read all agents’ current state from a single branch without querying across branches.

Every commit is pushed to DoltHub

After each tick, both the agent branch and main are pushed to the DoltHub remote in the background:

pushBranch(agent.branch_name).catch(err => console.error('push failed:', err))
pushBranch('main').catch(...)

This means every deliberation is publicly auditable on DoltHub. Anyone can inspect the full commit history for any persona in any game, not just the final answer.

---

What This Makes Possible

Parallel isolation without corruption. Each agent writes to its own branch. There are no write conflicts, locking issues, or race conditions between agents reasoning simultaneously.

Reasoning diffs. Because every iteration is a commit, you can diff two agents at the same iteration and see exactly where their reasoning diverged at the row level, not just the output level.

A complete audit trail. The agent_scores table on each branch contains the full history of that agent’s social score, planetary score, decision text, and reasoning for every iteration. Nothing is overwritten or lost.

Public verifiability. A Quorum result isn’t just a number. It’s a DoltHub link. A journalist can publish the result and link directly to the commit trail. A policymaker can defend a recommendation with a complete evidence chain.

---

The Implementation Detail That Matters Most

Dolt branches must fork from a committed state on main. If you branch before committing the parent rows, the agent branch won’t have those rows, and foreign key constraints will fail on the first insert.

The game creation route handles this explicitly:

1. Insert game row, agent rows, and baseline scores on main
2. CALL DOLT_ADD('.') + CALL DOLT_COMMIT(...) on the same dedicated connection
3. Only then: CALL DOLT_BRANCH(branchName) for each agent

This ordering is not optional. It is why withBranch opens a dedicated connection rather than using the shared pool. Each connection in Dolt has its own branch context, so branch checkout and subsequent writes must happen on the same connection.

---

Why Not Postgres, SQLite, or MongoDB?

Column 1	Column 2	Column 3
Requirement	Postgres / SQLite / Mongo	Dolt
Per-agent isolation	Separate tables or schemas, no native branching	Native branches
Commit history per row	Application-level audit log (extra work)	Built-in
Diff two agents at iteration N	Complex query across audit tables	CALL DOLT_DIFF(branch1, branch2, 'agent_scores')
Public audit trail	Custom export pipeline	Push to DoltHub
MySQL-compatible driver	N/A	mysql2 — zero driver changes


MySQL compatibility made Dolt a practical choice. The entire server uses mysql2 with no Dolt-specific driver. Swapping to a standard MySQL instance would require only a port change and removing CALL DOLT_* statements.

---

The Bigger Point

The database isn’t just storage here. The version history is the product.

A deliberation without a commit trail is just a chatbot that outputs a table. The Dolt branching architecture makes Quorum’s results inspectable, reproducible, and defensible, which is the whole point of building a deliberation engine rather than a question-answering tool.
