# Product 07 — Yard & Dock Management

## 1. Instruction Hierarchy & Governance
This directory governs Product 07 (Yard & Dock Management) of the TRUCKING platform.
Precedence:
1. `/Users/pranay/AGENTS.md`
2. `/Users/pranay/Projects/AGENTS.md`
3. `/Users/pranay/Projects/trucking/AGENTS.md`
4. This file (`products/product-07-yard-dock/AGENTS.md`)

Compatibility symlinks (`CLAUDE.md`, `CODEX.md`, `CURSOR.md`, `GEMINI.md`, `QWEN.md`) must point directly to this file.

---

## 2. Product Identity & Domain Boundary
- **Port:** `5179`
- **Focus:** Gate check-in/out, dock door reservation & assignment, yard spot occupancy & demurrage/detention tracking, hostler trailer jockey work queues, and cross-project integration with Command Center Portal and Warehouse Planner.
- **Tech Stack:** React 19, TypeScript, Vite 7, Vitest 3.

---

## 3. Sovereign Verification Commands
```bash
npm test        # Run Vitest test suite
npm run build   # Typecheck and production bundle build
npm run dev     # Start local server on port 5179
```

---

## 4. Cross-Project Bridges
- **Consumes:**
  - `command-center-portal` (Port 5170): Shipment & trip assignments
  - `product-06-warehouse-space-flow` (Port 5178): Inbound putaway readiness & dock door demand
- **Produces:**
  - `command-center-portal` (Port 5170): Real-time yard occupancy, gate timestamps, detention risk alerts

---

## 5. Git & Mutation Policy
- Read-only inspection is permitted (`git status`, `git diff`, `git log`).
- Staging, commits, pushes, and branch changes require explicit user authorization.
