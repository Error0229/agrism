# PM Team Log

## Last Completed Work

### Sprint 1 — Foundation (2026-03-06)
- Commits: `42c5031`, `6a879ae`, `76c6865`
- Farm location schema/UI (#83), planted crop lifecycle schema/UI (#85)

### Hotfix + Tests (2026-03-06)
- Commits: `8310a87`, `4e762ad`
- Fix crops schema, add 26 unit tests

### Inspector Redesign (2026-03-06)
- Commits: `42481fc`, `a2b6877`, `43532e9`
- Split area/crop sections, simplify dates, fix 2 QA bugs

### Sidebar Polish (2026-03-06)
- Team: `agrism-sidebar-polish` (deleted)
- Commit: `657d6af` — drag-reorder sections, remove 佔用中 toggle
- QA: all 7 checks passed, no critical/major issues, 2 minor + 1 cosmetic noted

### Learnings
- Worktree isolation doesn't create separate branches — changes land in working dir
- Always verify `npx convex dev --once` after schema changes
- Always include unit tests when adding new features (user requirement)
- Always run `bun run build` to catch TypeScript errors that lint misses
- QA catches real bugs — always spawn QA after frontend work
- zod + zodResolver: avoid `.or(z.literal(""))` for numeric fields — use string + refine
- Agents sometimes receive task assignments after already completing — benign
- ScrollArea was already in use in the inspector — check before adding

## Active Work
(None — ready for Sprint 2)
