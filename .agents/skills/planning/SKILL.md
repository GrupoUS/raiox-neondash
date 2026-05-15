---
name: planning
description: Use when /plan is executed, when tasks span multiple architectural layers, when third-party integrations need design before code, when a new feature spans multiple files, when "how should we build X?" requires an answer, when implementation order is unclear, or when architecture trade-offs need evaluation. Skip for single-file bug fixes with known root cause.
---

# Planning Skill

## Purpose

Produce **implementation-ready plans** before any code is written. Plans ground in the host project's layer chain and existing repo conventions. Plans MUST conform to the handoff schema in `.Codex/skills/senior-prompt-engineer/references/agent-handoff-contracts.md` when an agent will execute them.

> **Project-specific layer chain + verify commands** are loaded from `${overlay}/layer-map.md` (path resolved from `.Codex/config.json::overlay`). If overlay is missing, the skill uses the generic template in § Step 2.

---

## Hard Rule

Do not write code until the plan is presented and the user approves. State assumptions explicitly. Never guess silently.

---

## Step 1 — Classify

| Class | Indicators | Examples |
|---|---|---|
| **Simple** (L1-L3) | Single layer, known pattern | Add a column / config field / route file |
| **Medium** (L4-L5) | 2-3 layers, new domain behavior | New endpoint + client hook + view |
| **Complex** (L6+) | Architecture, integration, multi-file | New external integration, auth model change, schema migration with downstream consumers |

---

## Step 2 — Layer Chain

Every plan identifies which layers are touched, in dependency order. Use the project-specific layer chain from `${overlay}/layer-map.md` when present. Otherwise fall back to this generic template:

```
Data layer (DB schema / migration / fixtures)
  → Service / API layer (handler / procedure / route)
  → Router / registration
  → Client / query layer (hook / fetcher / SDK)
  → Presentation (component / view / page)
  → Cross-cutting (auth, SEO, a11y, perf, telemetry)
  → Verification (lint / type-check / test / build)
```

**Always plan in dependency order.** Never plan presentation before the data shape is fixed.

**Auth scope** — when the project has authenticated surfaces, choose the scope before planning the endpoint. Project-specific procedure levels (e.g., `publicProcedure` / `protectedProcedure` / `adminProcedure`) live in the overlay layer map. Generic guidance:

| Scope | When |
|---|---|
| Public (anon) | Health checks, public reads |
| Authenticated | User-bound actions |
| Admin / role-elevated | Privileged ops, settings, dashboards |
| Tenant-scoped | Multi-tenant data — must filter by tenant ID |

If the project has no authentication (static / public / build-time only), skip this section in the plan.

---

## Step 3 — Research (Medium and Complex)

**Codebase first, web second.**

Before planning new pattern, grep for what already exists:
- Existing handler / route / service for the domain — extension viable? (LEVER principle)
- Existing schemas / validators — reuse / extend / pick / omit
- Existing client query / hook — naming convention
- Existing component / view — extension over new build

**Research cascade** (stop when confidence ≥ 4):

| Source | Confidence | Tool |
|---|---|---|
| Codebase (Grep / Glob / Read) | 5 | direct |
| Official docs | 4-5 | `mcp__claude_ai_Context7__resolve-library-id` → `query-docs` |
| Community / current best practices | 3-4 | `mcp__tavily__search` (add year + version) |

Mark inferred constraints `[ASSUMED]`. Mark sourceless findings `[UNVERIFIED]`. Findings ≤ 2 confidence — flag, do not plan on them.

---

## Simple Plan Output (L1-L3)

```markdown
**Task:** [one line]
**Layer:** [data | service | router | client | presentation | cross-cutting]
**File:** `path/to/file`
**Steps:**
1. [atomic action — exact what, not vague how]
2. [atomic action]
**Verify:** `${tooling.packageManager} run ${tooling.typeChecker}` → no errors
```

No discovery, no research cascade, no contracts.

---

## Medium Plan Output (L4-L5)

```markdown
## Plan: [Feature Name]

**Complexity:** L[N]
**Layers touched:** [e.g., schema → API → client → view]
**Assumptions:** [ASSUMED: ...]

### Phase 1: Data [SEQUENTIAL]
- [ ] `${paths.schemaRoot}/...` — add `[name]` to `[entity]` — verify per overlay

### Phase 2: API [SEQUENTIAL]
- [ ] `${paths.backendRoot}/<domain>` — add handler `[name]` with input validator `[schema]`
- [ ] Register in router/index if new domain

### Phase 3: Client + UI [PARALLEL if independent]
- [ ] `${paths.frontendRoot}/<hooks-or-queries>/use[Domain]` — add query/mutation
- [ ] `${paths.frontendRoot}/<view>` — wire query, render result

**Verify:** lint + type-check + test + build commands per `${overlay}/layer-map.md` (or `.Codex/config.json::tooling`)

**Risks:** [non-obvious risks with mitigations]
```

---

## Complex Plan Output (L6+)

Full D.R.P.I.V protocol:

```
DISCOVER → RESEARCH → PLAN → SPRINT CONTRACTS → EVALUATOR GATE
```

**Discovery:** one question at a time. Present 2-3 approaches with trade-offs. Lead with recommendation. Write design doc to `docs/plans/YYYY-MM-DD-<topic>.md` before proceeding. Detail → `references/01-discover.md`.

**Research:** full cascade. Findings with confidence scores. Minimum 5 edge cases for L4+.

**Sprint contracts (mandatory L6+):**

```markdown
**Sprint N — [Name]**
Scope: [what gets built]
Done when:
  - [ ] [testable criterion — verifiable by command, test, or smoke]
  - [ ] [edge case handled]
Out of scope: [explicit deferrals]
```

Full contract format → `references/04-harness-patterns.md`.

**Handoff to executor agent:** plan output MUST conform to `.Codex/skills/senior-prompt-engineer/references/agent-handoff-contracts.md` (Context Handoff schema, status invariants). Parallel-batch tasks return per `parallel-batch-contracts.md`.

**Evaluator gate (mandatory L6+):** spawn `evaluator` agent with the plan.

| Dimension | Threshold | Checks |
|---|---|---|
| Completeness | ≥ 8 | Every requirement maps to ≥1 task |
| Atomicity | ≥ 7 | Each step is 2-5 min of work |
| Risk coverage | ≥ 7 | Top risks identified with mitigations |
| Dependency order | ≥ 8 | Tasks execute without backtracking |

Below any threshold → evaluator returns specific failures → revise. Max 3 revision iterations before escalating to user (or coordinator BLOCKED → `/debug recover` per `.Codex/AGENTS.md § Stopping conditions`).

Calibration anchors → `references/04-harness-patterns.md`.

---

## Self-Review Checklist (every plan before presenting)

- [ ] Affected layers identified and ordered (data → service → router → client → presentation → cross-cutting)
- [ ] Auth/permission scope chosen for each new endpoint (or marked N/A if project has no auth)
- [ ] Validation schemas placed at module level (not inside handlers)
- [ ] New routers / handlers registered in entry index
- [ ] Verify command per phase (lint / type-check / test / build per project convention)
- [ ] Project cardinal rules honored — re-read `.Codex/AGENTS.md` cardinal rules before presenting
- [ ] All assumptions labeled `[ASSUMED]`

---

## Anti-Patterns

| Bad | Good |
|---|---|
| "Implement auth" as a step | `<authRoot>/schema.ts` — define LoginSchema with `.email()`, `.min(8)` |
| "Add validation" | Exact validator + bound on each user input |
| Research skipped for Medium+ | Grep existing patterns first |
| Presentation planned before data | Layer order: data → service → router → client → presentation |
| Plan invents a layer the project doesn't have (e.g., DB in a static-only repo) | Check overlay layer map; drop layers that don't apply |
| Assumption not labeled | `[ASSUMED]` every inferred constraint |
| Full contracts for L3-L5 | Mini-contract or verify command sufficient |
| Planner specifies HOW | Planner names files + effects; executor defines impl |
| 5 questions at once | One question at a time |

---

## Red Flags — Stop

| Red flag | Action |
|---|---|
| Coding before plan approved | Stop. Present plan first. |
| Plan has "TBD" | Research the unknown before presenting. |
| Finding with confidence ≤ 2 | Find better source or label `[UNVERIFIED]`. |
| L6+ sprint without contract | Write contract first. |
| L6+ plan without evaluator gate | Spawn evaluator — self-review insufficient at L6+. |
| Assumption silently baked in | Label `[ASSUMED]`. |
| Plan invents layers the project doesn't have | Re-read overlay layer map / `.Codex/config.json` / cardinal rules. |

---

## Configuration

Reads `.Codex/config.json` for:
- `${paths.*}` — file path scaffolding in generated plans (`schemaRoot`, `backendRoot`, `frontendRoot`, `componentsRoot`, `libRoot`, `stylesRoot`)
- `${tooling.*}` — verify commands (`packageManager`, `typeChecker`, `linter`, `testRunner`, `buildTool`, `deployer`, `frontendFramework`, `database`, `orm`)
- `${overlay}` — project-specific overlay directory (optional)
- `${overlay}/layer-map.md` — project-specific layer chain + verify commands

**Empty path/tooling fields signal "this project has no such layer."** Plans must not invent layers the project lacks. Example: if `paths.backendRoot` and `paths.schemaRoot` are empty, the project is presentation-only — drop Data + Service + Router phases.

To use in a different project: copy `.Codex/skills/planning/`, populate `.Codex/config.json` paths/tooling, optionally write `${overlay}/layer-map.md` documenting the project's layers + verify commands.

---

## References

- `references/01-discover.md` — Discovery protocol for complex tasks
- `references/02-plan.md` — Full plan template with sprint sections
- `references/03-risk.md` — Risk assessment patterns
- `references/04-harness-patterns.md` — Sprint contracts, evaluator calibration, GAN harness, context resets
- `.Codex/skills/senior-prompt-engineer/references/agent-handoff-contracts.md` — Context Handoff schema (planner → executor handoff)
- `.Codex/skills/senior-prompt-engineer/references/parallel-batch-contracts.md` — Findings table + consolidation rules for parallel batches
- `.Codex/AGENTS.md` — host project's cardinal rules + routing matrix
- `.Codex/config.json` — host project's paths / tooling / gates
- `${overlay}/layer-map.md` — **project-specific** layer stack (loaded if overlay configured)
