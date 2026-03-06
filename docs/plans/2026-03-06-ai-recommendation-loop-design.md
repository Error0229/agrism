# AI Recommendation Loop Design

Date: 2026-03-06
Status: Drafted for implementation
Related issues: #93, #94, #95, #96, #97

## Goal

Reposition AI from a separate chat page into a structured farm assistant that:

- summarizes what matters now
- proposes changes when conditions shift
- helps with irrigation and pest triage
- learns from farmer feedback

This design assumes planning and crop data foundations are improved first.

## 1. Product stance

The AI layer should not be the primary source of truth.

Structured farm data remains the source of truth:

- fields
- planted crops
- plans
- weather
- records
- crop knowledge profiles

AI should read that state and produce explainable recommendation objects.

## 2. Recommendation object model

Before adding more prompts, define a stable recommendation shape.

Recommended fields:

- `id`
- `type`
- `title`
- `summary`
- `recommendedAction`
- `priority`
- `confidence`
- `reasoning`
- `evidenceRefs`
- `sourceSignals`
- `requiresApproval`
- `status: new | accepted | snoozed | dismissed | completed`
- `createdAt`
- `expiresAt`

This turns AI output into product-grade objects rather than transient chat text.

## 3. Daily briefing

## 3.1 Objective

The home surface should provide a small set of ranked recommendations, not a generic dashboard and not a long chat transcript.

## 3.2 Daily briefing composition

The first version should combine:

- overdue or high-urgency work
- weather-driven risks
- stage-driven care actions
- blocked or conflicting plans
- optional low-priority opportunities

Each card should answer:

- what to do
- why now
- what happens if ignored
- how confident the system is

## 4. Feedback loop

The farmer must be able to respond to advice in structured ways:

- accept
- snooze
- dismiss
- already done

Optional reason capture matters for dismissals and overrides.

This feedback should be visible to later recommendation generation so the product can reduce repeated low-value advice.

## 5. Weather-triggered replans

When weather shifts materially, the system should produce a proposal rather than silently mutating the plan.

Typical examples:

- delay planting
- advance harvest
- increase support/tie-down work
- reduce watering after rain
- add disease-prevention work after wet/humid conditions

The UI should show:

- old expectation
- new proposal
- why it changed
- whether user approval is required

## 6. Irrigation advisor

This app’s domain includes manual valve-based watering.

That means irrigation suggestions should be operational, not abstract.

The AI output should aim for:

- which zone/group to water
- approximate order
- approximate duration
- whether to skip because of recent rain

The first version can remain heuristic and non-hardware-controlled.

## 7. Pest and disease triage

The pest assistant should not promise perfect diagnosis.

It should instead:

- capture structured observations
- produce a ranked shortlist of possible causes
- explain likely triggers
- suggest next checks
- suggest practical responses

Image support can come later, but the underlying observation history should exist first.

## 8. Architecture recommendation

## 8.1 Keep recommendation generation separate from chat

Do not make the daily recommendation system depend on chat history.

Instead:

1. build a structured farm context object
2. build a recommendation generation service
3. store recommendation objects
4. optionally let chat explain or expand them

## 8.2 Source signals

Each recommendation should record the structured signals used to generate it, such as:

- crop stage
- weather alert
- occupancy conflict
- recent rainfall
- user feedback pattern

This will help future debugging and trust.

## 8.3 Approval boundary

The first release should default to human approval for:

- plan changes
- task rescheduling
- irrigation changes beyond reminder level

Silent automatic execution should be avoided at this stage.

## 9. UX recommendation

## 9.1 AI should be embedded in workflows

Better surfaces:

- daily briefing cards on home
- suggestion drawer in field planner
- explanation panel on crop detail
- pest triage workflow in records/observations

Less emphasis:

- standalone empty chat page as the main AI surface

## 9.2 Show uncertainty clearly

AI outputs should display:

- confidence
- whether the advice is based on exact or estimated lifecycle data
- whether the advice is based on generic or localized crop knowledge

## 10. Sequencing

1. define recommendation object model
2. launch daily briefing cards with manual accept/snooze/dismiss
3. add feedback memory
4. add weather-triggered replan proposals
5. add irrigation advisor
6. add pest triage assistant

## 11. Validation

### Unit tests

- recommendation scoring/ranking helpers
- feedback-state transitions
- proposal diff formatting
- irrigation suggestion heuristics

### Manual checks

- day with no urgent work
- day with conflicting recommendations
- weather change that triggers a replan proposal
- repeat dismissal of the same recommendation type

## 12. Guardrails

- Do not make AI the only place where important state exists.
- Do not bury important recommendations inside chat transcripts.
- Do not mutate the farm plan silently when confidence is low.
- Do not pretend pest triage is guaranteed diagnosis.
