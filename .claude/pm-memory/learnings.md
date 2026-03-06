# PM Learnings

## Technical Patterns
- Convex schema must match ALL data in DB — run `npx convex dev --once` to verify
- zod + zodResolver: avoid `.or(z.literal(""))` for numeric fields — use string + refine
- Sidebar height: use `max-h-svh overflow-hidden` + `min-h-0` flexbox trick to constrain
- @dnd-kit: must use `DragOverlay` for clean drag visuals, don't rely on inline transform
- Drag handles: use inline flex layout, NOT absolute positioning
- Sidebar overflow only happens when planted crop is selected (CropSelectionSection with lifecycle fields)

## Auth & Testing
- Clerk test login: use `test+clerk_test@test.com` with passcode `424242` (this account has persistent data)
- QA must do REAL browser testing, NOT code review
- Use Claude Code's built-in Chrome tool (`claude --chrome`) for QA — Playwright MCP is too token-heavy
- Always run `bun run build` — catches TypeScript errors that lint misses

## PM Process
- Always use Agent Teams (TeamCreate/TaskCreate/SendMessage) — don't fall back to plain Agent calls
- Agent Teams shutdown can get stuck — if an agent won't approve, ask user to kill manually
- QA doing code review instead of browser testing is useless — user explicitly forbids it
- Committing in small steps per user preference

## Codebase Insights
- crops table had extra fields from seed data not in schema
- Field editor sidebar height chain: root-shell → SidebarProvider → SidebarInset → main → property-inspector → ScrollArea
- plantedCrops.plantedDate is a string field (not number timestamp)
