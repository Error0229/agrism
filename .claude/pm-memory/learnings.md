# PM Learnings

## Technical Patterns
- Convex schema must match ALL data in DB — run `npx convex dev --once` to verify
- zod + zodResolver: avoid `.or(z.literal(""))` for numeric fields — use string + refine
- Sidebar height: use `max-h-svh overflow-hidden` + `min-h-0` flexbox trick to constrain
- @dnd-kit: must use `DragOverlay` for clean drag visuals, don't rely on inline transform
- Drag handles: use inline flex layout, NOT absolute positioning
- N+1 query pattern in Convex: when looping over items and fetching related data, batch-collect IDs first, fetch all with Promise.all, then lookup from Map
- Duplicate DB fetches: watch for ctx.db.get() called multiple times for the same ID in one query
- Geography key convention: TW → TW-HUA → TW-HUA-吉安 (country → county → district)
- Farm override bug pattern: when upserting to a profile, always check if the correct scope profile exists
- Convex actions need `"use node"` directive for HTTP calls
- Convex public actions can check auth via `ctx.auth.getUserIdentity()` — always add this for actions that consume external API credits
- Convex internalAction/internalQuery bypass auth — use for CLI/batch operations
- When nuking and rebuilding schema with existing data: temporarily relax schema to v.any(), deploy, run cleanup mutation, restore strict schema, redeploy
- AI structured output via OpenRouter: use `response_format: { type: "json_object" }` with focused schemas per pass for better accuracy
- OpenRouter model IDs change — verify current model ID (was `anthropic/claude-sonnet-4-20250514`, changed to `anthropic/claude-3.5-sonnet`)

## Auth & Testing
- Clerk test login: use `test+clerk_test@test.com` with passcode `424242` (this account has persistent data)
- QA must do REAL browser testing, NOT code review
- Use Claude Code's built-in Chrome tool (`claude --chrome`) for QA — Playwright MCP is too token-heavy
- Always run `bun run build` — catches TypeScript errors that lint misses
- Set env vars in Convex with `npx convex env set KEY value` — check with `npx convex env list`

## Cost & LLM Model Selection
- ALWAYS ask user before using any LLM model — it costs money
- User wants to choose the model with best performance/cost ratio
- Never hardcode a model choice — present options and let user decide
- Current model choice: `google/gemini-3-flash-preview` via OpenRouter (for user-facing AI features)
- For default/seed data: DON'T use external LLM — have Claude agents do web research instead (free, better quality)
- OpenRouter is for user-triggered features only (e.g., "AI 補充知識" button), not for batch seeding

## Deployment
- Convex dev server must be running for backend changes to take effect — if user reports "still broken" after code fixes, check if `npx convex dev` is running
- R2 bucket: agrism-crop-media, public URL: https://media.agrism.catjam.dev
- R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL (all on Vercel production)

## PM Process
- Always use Agent Teams (TeamCreate/TaskCreate/SendMessage) — don't fall back to plain Agent calls
- Agent Teams shutdown can get stuck — if an agent won't approve, ask user to kill manually
- QA doing code review instead of browser testing is useless — user explicitly forbids it
- Committing in small steps per user preference
- Two backend agents can work in parallel on independent tracks efficiently
- Two frontend agents can work in parallel when their backends are done
- Review agent catches real performance bugs — always run review before QA
- When agents produce code with build errors, fix them at PM level rather than re-spawning agents

## Skills Usage
- `find-skills` searches a NETWORK REGISTRY — agents can discover and install new skills, not just local ones
- If PM already knows which skill fits, tell agent to call it directly (e.g., "Use Skill tool to call `frontend-design`")
- Only use `find-skills` when the agent might need skills PM doesn't know about
- Frontend UI tasks → tell agent to use `frontend-design` skill directly
- React/Next.js tasks → tell agent to use `vercel-react-best-practices` skill directly

## Codebase Insights
- crops table: 60+ fields, flat structure (no more cropProfiles table)
- cropProfiles, cropProfileResolver.ts, crop-facts.ts, use-crop-profiles.ts — all DELETED in #98
- AI enrichment: convex/cropEnrichment.ts with 7-pass structured output via OpenRouter
- use-crop-enrichment.ts hook exists but not yet wired to UI (placeholder toast on "AI 補充知識" button)
- Field editor sidebar height chain: root-shell → SidebarProvider → SidebarInset → main → property-inspector → ScrollArea
- plantedCrops.plantedDate is a string field (not number timestamp)
- plannedPlantings table: indexed by_farmId, by_fieldId
