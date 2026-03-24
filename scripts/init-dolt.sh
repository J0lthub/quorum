#!/usr/bin/env bash
set -euo pipefail

# DATA_DIR is the sql-server --data-dir (contains database subdirectories)
# The actual Dolt repo lives at DATA_DIR/donut_game/
DATA_DIR="${DOLT_DATA_DIR:-./donut-game-db}"
DB_DIR="$DATA_DIR/donut_game"
DOLT_BIN="${DOLT_BIN:-$(command -v dolt)}"
if [ -z "$DOLT_BIN" ]; then echo "dolt not found in PATH"; exit 1; fi

echo "==> Initializing Dolt repo at $DB_DIR"
mkdir -p "$DB_DIR"
cd "$DB_DIR"

if [ ! -d ".dolt" ]; then
  "$DOLT_BIN" init
  "$DOLT_BIN" config --local --add user.email "donut-game@local"
  "$DOLT_BIN" config --local --add user.name  "Donut Game"
  "$DOLT_BIN" remote add origin j0lt/Donut_Game
fi

run_sql() {
  "$DOLT_BIN" sql -q "$1"
}

echo "==> Creating tables"
run_sql "
CREATE TABLE IF NOT EXISTS datasets (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  row_count   INT          NOT NULL DEFAULT 0,
  category    VARCHAR(64)  NOT NULL,
  description TEXT
);
"

run_sql "
CREATE TABLE IF NOT EXISTS games (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  question    TEXT          NOT NULL,
  status      VARCHAR(16)   NOT NULL DEFAULT 'active',
  username    VARCHAR(64)   NOT NULL DEFAULT 'anonymous',
  dataset     VARCHAR(128)  NOT NULL DEFAULT '',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"

run_sql "
CREATE TABLE IF NOT EXISTS agents (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  game_id     VARCHAR(36)   NOT NULL,
  persona_id  VARCHAR(64)   NOT NULL,
  branch_name VARCHAR(128)  NOT NULL,
  iteration   INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id)
);
"

run_sql "
CREATE TABLE IF NOT EXISTS agent_scores (
  id               VARCHAR(36) NOT NULL PRIMARY KEY,
  agent_id         VARCHAR(36) NOT NULL,
  game_id          VARCHAR(36) NOT NULL,
  iteration        INT         NOT NULL,
  social_score     DOUBLE      NOT NULL,
  planetary_score  DOUBLE      NOT NULL,
  habitable_score  DOUBLE      NOT NULL,
  is_in_zone       TINYINT(1)  NOT NULL DEFAULT 0,
  commit_message   TEXT,
  decision         TEXT,
  reasoning        TEXT,
  committed_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (game_id)  REFERENCES games(id)
);
"

run_sql "
CREATE TABLE IF NOT EXISTS leaderboard (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  username        VARCHAR(64)  NOT NULL,
  game_id         VARCHAR(36)  NOT NULL,
  best_score      DOUBLE       NOT NULL,
  winning_persona VARCHAR(64)  NOT NULL,
  question        TEXT         NOT NULL,
  dataset         VARCHAR(128) NOT NULL DEFAULT '',
  commit_hash     VARCHAR(40)  NOT NULL DEFAULT '',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"

echo "==> Seeding datasets"
run_sql "INSERT IGNORE INTO datasets (id, name, row_count, category, description) VALUES
  ('ds-01', 'EPA-2024',       42800, 'Environment', 'US EPA emissions and pollutant tracking 2024'),
  ('ds-02', 'FAOSTAT-2024',   91200, 'Agriculture', 'UN FAO global food and agriculture statistics'),
  ('ds-03', 'ILO-2023',       33400, 'Labour',      'ILO global employment and care economy data'),
  ('ds-04', 'ONS-2024',       18700, 'Economics',   'UK Office for National Statistics macro data'),
  ('ds-05', 'C40-Cities-23',  27600, 'Urban',       'C40 Cities climate action and heat-island data'),
  ('ds-06', 'ITU-2024',       14200, 'Technology',  'International Telecommunication Union ICT stats'),
  ('ds-07', 'Eurostat-2024',  64500, 'Social',      'Eurostat social and economic indicators 2024'),
  ('ds-08', 'IUCN-2024',      21900, 'Biodiversity','IUCN Red List and ecosystem health data'),
  ('ds-09', 'TfL-Open-2024',   8400, 'Transport',   'Transport for London open data 2024');
"

# Debug: run_sql "SHOW COLUMNS FROM dolt_diff_agent_scores;" 2>&1 | head -20

echo "==> Initial Dolt commit"
run_sql "CALL DOLT_ADD('.')"
run_sql "CALL DOLT_COMMIT('-m', 'init: create schema and seed datasets')"

echo "==> Done. Run 'npm run dolt' to start the sql-server, then 'npm run server' for Express."
