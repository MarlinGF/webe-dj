# We-be Radio Planning

## Purpose

This document captures the planning decisions currently locked in for repositioning `We-be DJ` as the private control center for `We-be Radio` inside the broader We-be ecosystem.

This is a planning/alignment document only. It is not an implementation spec and it should not be treated as final source of truth over the main We-be app. We-be remains the boss system.

## Current Position

- `We-be` is the existing production platform and long-term source of truth.
- `We-be DJ` is no longer being treated as a standalone product-first app.
- `We-be DJ` is being repositioned as the operator control center for `We-be Radio`.
- `We-be Jukebox` is expected to be a separate public-facing listener app unless later architectural review suggests otherwise.
- The near-term launch target is one station and one genre.
- The long-term architecture should still assume future expansion.

## Platform Assumptions

- The main We-be repo lives at `/Users/marlinandrews/WeBe-Live`.
- The main Firebase project is `we-be-plus`.
- We-be already owns canonical platform concerns such as:
  - users and identities
  - pages/business/artist entities
  - songs and related metadata
  - purchases and entitlements
  - live/session-style primitives
- The current We-be backend pattern leans primarily on Next.js routes and server actions rather than a Cloud Functions-first architecture.

## Locked Planning Decisions

### 1. Source Of Truth

- We-be should remain the long-term source of truth.
- We should not keep a permanently separate DJ Firebase backend if it conflicts with We-be ownership of data and auth.
- Shared Firebase under `we-be-plus` is the preferred long-term direction.
- DJ is an operator surface inside the We-be ecosystem, not a long-term independent truth system.

### 2. App Boundaries

- `We-be DJ` should be a private operator-facing control app.
- `We-be Jukebox` should be a separate public listener-facing app.
- Separate frontend apps are acceptable.
- Separate long-term data truth is not acceptable.

### 3. Station Scope

- V1 should support one station.
- V1 should support one genre.
- The schema should still use `stationId` from the beginning so future expansion is additive rather than a rewrite.

### 4. Song Governance

- Artists in We-be should be able to approve songs for radio play.
- Song approval should not live only inside DJ.
- We-be should own creator approval and governance.
- DJ should consume approved/eligible radio inventory rather than inventing its own.
- Station admins/operators may curate station inclusion only within the eligibility framework defined by We-be.
- V1 radio inventory should be restricted to songs uploaded by We-be artists/pages and explicitly approved for radio play within We-be.

### 5. Radio Eligibility Model

- A simple boolean on `songs` is not enough as the full long-term model.
- Preferred direction:
  - song-level creator approval metadata on canonical song records
  - station-specific curation and eligibility in a station catalog model

### 6. Radio Domain

- Radio should have its own domain model.
- We should not force radio automation awkwardly into existing live-stream collections.
- Existing live/session ideas may inform the design, but radio should still have dedicated station models.
- Canonical radio records should live in shared station-domain models, even when DJ is the surface writing or publishing updates.

### 7. Commercials And Ads

- DJ should eventually support:
  - autoplay
  - queueing
  - rotation logic
  - commercial insertion
  - package logic such as `X plays per day`
- Commercials should rotate rather than repeating the same spot unnecessarily.
- Commercial libraries should support organization by duration/length.
- A native path for ads coming from We-be business pages is desirable.
- Ads should not be forced to come only from We-be business pages.
- We-be business pages should likely receive ecosystem advantages later, such as discounting or easier self-serve campaign workflows.

### 8. Existing DJ UX Preservation

- The current playlist workflow is valuable and should be preserved wherever practical.
- The current deck-based operator experience is valuable and should be preserved wherever practical.
- We should avoid replacing the existing song deck interaction model unless there is a strong product or technical reason.
- We should prefer replatforming the underlying data model and integrations rather than discarding the operator UX that already works.

### 9. Station Ownership And Permissions

- Stations should be tied to We-be-owned identity structures rather than loose standalone DJ-user ownership.
- Station ownership should likely align to existing We-be page/platform ownership concepts.
- Operator permissions should extend existing We-be auth and role concepts rather than introducing a separate auth model just for DJ.

### 10. Station Settings

- Station settings should be treated as a first-class model.
- We should expect a dedicated station configuration/settings layer even if the exact schema is still evolving.

### 11. Canonical Airplay Data

- `now playing` should be treated as shared station truth, not DJ-only truth.
- `airplay logs` should be treated as platform-level canonical reporting data, not DJ-local throwaway logs.
- DJ may publish playback events and state transitions, but the canonical records should live in the shared station domain.
- Airplay data should be modeled with future charting/reporting in mind.

### 12. V1 Ad Scope Discipline

- V1 ad logic should stay intentionally simple.
- V1 should support:
  - duration-aware spot organization
  - rotation
  - simple campaign counters such as target plays per day
- V1 should not overbuild reporting, billing automation, or advanced ad-ops workflows.

### 13. Rights And Liability Posture

- V1 should prioritize a closed, auditable radio catalog over broad outside ingestion.
- Artists/pages should be required to affirm that they have the rights needed to upload and authorize radio play.
- Station operators should be required to use only approved station inventory.
- We should design the system so approval, inclusion, and airplay actions are auditable.
- Terms and user affirmations can shift contractual responsibility, but they should not be treated as complete legal protection by themselves.

## Recommended Radio Models

These are the models currently favored for planning. They are recommendations, not final implemented schema.

- `stations`
- `stations/{stationId}/settings`
- `stations/{stationId}/catalog`
- `stations/{stationId}/playlists`
- `stations/{stationId}/rotations`
- `stations/{stationId}/schedule`
- `stations/{stationId}/adCampaigns`
- `stations/{stationId}/adSpots`
- `stations/{stationId}/operators`
- `stationNowPlaying`
- `stationAirplayLogs`

## Ownership Boundaries

### We-be Should Own

- canonical users and auth identity
- page/business/artist identity
- canonical songs and song metadata
- artist approval for radio play
- station ownership and permissions framework
- station catalog governance
- canonical station-domain records
- long-term platform truth

### DJ Should Own

- operator workflow and control UI
- queue management
- deck/loading/playback controls
- autoplay execution
- playlist execution
- rotation execution
- commercial break insertion
- publishing playback state/events into shared station models
- station operations UX

### DJ Should Stop Owning Long-Term

- its own separate canonical song library
- its own separate permanent auth/data truth
- radio eligibility decisions made without We-be governance
- ad/commercial models that only make sense as personal DJ-user data
- canonical now playing and reporting truth as DJ-local state

## Integration Direction

The current preferred contract is:

- We-be owns canonical song and approval truth.
- A shared station domain exists in the We-be ecosystem.
- DJ consumes station-approved inventory and publishes operational playback state/events into the shared station domain.
- Jukebox consumes public station output/state.

This should be treated as a bounded shared-data architecture, not a pair of apps syncing two unrelated systems.

## V1 Radio Goal

The minimum viable radio system should support:

- one station
- one genre
- first-class station settings
- approved station catalog
- simple station playlists
- autoplay
- commercial insertion every `N` songs
- duration-aware commercial organization
- basic campaign delivery logic
- shared now playing state
- canonical airplay logs suitable for future charts/reporting

## V2 Expansion Direction

The likely expansion path includes:

- multiple stations
- multiple genres
- station-specific catalogs
- richer rotation rules
- daypart scheduling
- campaign windows and fulfillment logic
- multiple operators
- stronger reporting and analytics
- charts and platform-level airplay ranking systems

## Confirmed Product Preferences So Far

- We-be Radio is the real-world direction for this app.
- We-be Jukebox should stay under consideration as a separate listener app.
- We-be Music Store is expected to become a song source for station inventory, but the exact integration path is not yet finalized.
- Pages in We-be, especially business pages, should be encouraged to advertise on We-be Radio.
- We should support that natively without blocking other advertiser types.
- The playlist logic and song deck UI should remain intact unless a strong reason emerges to change them.
- Future charts matter, including the possibility of artists striving for a `#1` hit based on airplay data.
- Rights protection matters, and the early radio catalog should stay closed to We-be-approved artist inventory.

## Open Questions

These still need explicit decisions before implementation:

- Should station governance UI live only in We-be, or partly in DJ?
- Who can curate the station catalog?
- How should station operators be modeled against the current We-be roles/page-admin concepts?
- What is the exact v1 ad package model?
- What does the first artist approval workflow look like in We-be?
- How should We-be Music Store inventory become station-eligible inventory?
- What public station state should Jukebox consume first?
- What chart windows and aggregation rules should exist later so the raw airplay model does not need to be reinvented?
- What exact legal/policy language should counsel approve for uploads, radio approval, and station operator use?

## Working Rule

Before implementation, we should continue to treat We-be as the final authority on platform architecture. Any DJ-side build decisions should be reviewed against the real We-be codebase and data model before coding begins.
