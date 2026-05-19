# Radio Domain Proposal

## Purpose

This document proposes the next-level shared radio domain for the We-be ecosystem before implementation begins.

It is intended to answer four questions:

- what shared models are required before building
- which models are canonical platform records
- which app should own which workflows
- how v1 should stay small while still supporting future expansion

This proposal assumes:

- We-be remains the source of truth
- We-be DJ is an operator surface
- We-be Jukebox is a future listener surface
- radio data should live in shared We-be station-domain models

## Design Principles

- Use shared station-domain records in the main We-be ecosystem.
- Keep canonical platform truth out of DJ-local-only models.
- Use `stationId` from day one, even for a single-station launch.
- Separate canonical catalog truth from operational playback state.
- Keep v1 simple, but preserve paths to multi-station, charting, and richer ad operations.

## Proposed Core Domain

### 1. `stations`

Purpose:
- canonical station entity

Suggested responsibilities:
- station identity
- station ownership linkage
- station status
- public/private visibility basics

Suggested fields:
- `id`
- `name`
- `slug`
- `ownerType`
- `ownerId`
- `genre`
- `status`
- `createdAt`
- `createdBy`

Notes:
- `ownerType` and `ownerId` should align to existing We-be identity structures, likely page/platform ownership patterns.
- even if only one station exists now, this model should exist immediately.

### 2. `stations/{stationId}/settings`

Purpose:
- station behavior and automation configuration

Suggested responsibilities:
- autoplay defaults
- commercial cadence
- queue/rotation behavior
- public playback preferences

Suggested fields:
- `autoplayEnabled`
- `commercialIntervalSongs`
- `defaultBreakSpotCount`
- `rotationMode`
- `allowExplicit`
- `defaultGenre`
- `updatedAt`
- `updatedBy`

Notes:
- this should be a first-class model, not scattered settings on multiple docs.

### 3. `stations/{stationId}/catalog/{songId}`

Purpose:
- station-specific playable inclusion model

Suggested responsibilities:
- inclusion/exclusion for a station
- station-side curation
- station-side weighting/categorying

Suggested fields:
- `songId`
- `included`
- `status`
- `category`
- `weight`
- `approvedBy`
- `approvedAt`
- `notes`
- `effectiveFrom`
- `effectiveTo`

Notes:
- this is not the same thing as creator approval.
- creator approval still belongs on canonical song data in We-be.
- this model answers: "can this station use this song, and how?"

### 4. `stations/{stationId}/playlists`

Purpose:
- station playlists used by DJ workflows and automation

Suggested responsibilities:
- curated lists
- operator-assembled sequences
- reusable station programming blocks

Suggested fields:
- `name`
- `description`
- `status`
- `itemRefs`
- `createdAt`
- `createdBy`
- `updatedAt`

Notes:
- keep playlist workflow close to the existing DJ UX.
- playlist items should reference shared catalog entities, not duplicate whole song docs.

### 5. `stations/{stationId}/rotations`

Purpose:
- autoplay selection logic

Suggested responsibilities:
- selection rules
- fair rotation behavior
- category-based airplay

Suggested fields:
- `name`
- `status`
- `rules`
- `categories`
- `repeatProtection`
- `updatedAt`

Notes:
- v1 can be simple.
- the key is to avoid hardcoding autoplay into UI-only logic.

### 6. `stations/{stationId}/schedule`

Purpose:
- future scheduling and dayparting

Suggested responsibilities:
- future programming windows
- assigned playlist/rotation blocks
- show-level expansion later

Suggested fields:
- `name`
- `startTime`
- `endTime`
- `daysOfWeek`
- `rotationId`
- `playlistId`
- `status`

Notes:
- likely minimal or lightly used in v1.
- still worth reserving conceptually now.

### 7. `stations/{stationId}/adCampaigns`

Purpose:
- commercial campaign logic

Suggested responsibilities:
- advertiser package definition
- delivery targets
- campaign activity windows

Suggested fields:
- `name`
- `advertiserType`
- `advertiserId`
- `linkedPageId`
- `status`
- `targetPlaysPerDay`
- `startDate`
- `endDate`
- `priority`
- `createdAt`
- `createdBy`

Notes:
- `linkedPageId` should support the preferred We-be business page path.
- campaigns should still support non-page advertisers.
- v1 should keep this simple.

### 8. `stations/{stationId}/adSpots`

Purpose:
- individual audio spot assets

Suggested responsibilities:
- commercial files
- duration grouping
- spot-to-campaign linkage

Suggested fields:
- `campaignId`
- `title`
- `durationSeconds`
- `audioUrl`
- `storagePath`
- `status`
- `rotationWeight`
- `createdAt`

Notes:
- this model should support duration-aware spot organization from the start.

### 9. `stations/{stationId}/operators`

Purpose:
- station-specific operational access

Suggested responsibilities:
- station role assignment
- operational permissions

Suggested fields:
- `userId`
- `role`
- `status`
- `grantedBy`
- `grantedAt`

Notes:
- this should extend We-be auth/role concepts rather than inventing a second auth system.

### 10. `stationNowPlaying`

Purpose:
- public/shared current playback state

Suggested responsibilities:
- the currently playing song
- station playback metadata
- listener-facing state for Jukebox and other consumers

Suggested fields:
- `stationId`
- `songId`
- `title`
- `artistName`
- `startedAt`
- `expectedEndAt`
- `sourceType`
- `sourceRefId`
- `publishedAt`

Notes:
- this is canonical shared station truth.
- DJ may publish updates to it, but it should not be treated as DJ-local truth.

### 11. `stationAirplayLogs`

Purpose:
- canonical playback history and reporting basis

Suggested responsibilities:
- auditable airplay history
- campaign fulfillment support
- charting/reporting foundation

Suggested fields:
- `stationId`
- `playedAt`
- `contentType`
- `contentId`
- `songId`
- `campaignId`
- `spotId`
- `durationSeconds`
- `sourceType`
- `playlistId`
- `rotationId`
- `operatorId`

Notes:
- this should be modeled as platform-level reporting data.
- future charts should derive from this or its aggregates.

## Creator Approval Layer

This proposal assumes a two-layer approval model:

### Canonical song approval in We-be

Likely on `songs/{songId}` or a related canonical approval structure:
- `radioApprovalStatus`
- `radioApprovedBy`
- `radioApprovedAt`
- `radioGenres`
- `radioRestrictions`

Purpose:
- artist/rights-holder approval
- policy eligibility

### Station inclusion in station catalog

In `stations/{stationId}/catalog/{songId}`:
- station-specific inclusion
- category/weighting
- curation decisions

Purpose:
- station programming decisions

## Ownership Boundaries

### We-be owns

- users and auth identity
- page/business/artist identity
- canonical songs
- creator approval state
- station entities
- station ownership and permissions framework
- canonical public station state
- canonical airplay reporting records

### DJ owns

- operator UX
- deck workflows
- playlist interaction UX
- queue manipulation UX
- playback control workflows
- publishing station operational events and state transitions

### Jukebox owns

- listener-facing playback experience
- consumption of public station state
- future listener-side playlists and engagement

## Minimum Shared Models Required Before Implementation

These are the minimum shared models I would want agreed before writing the radio feature set:

1. `stations`
2. `stations/{stationId}/settings`
3. `stations/{stationId}/catalog/{songId}`
4. `stations/{stationId}/playlists`
5. `stations/{stationId}/rotations`
6. `stations/{stationId}/adCampaigns`
7. `stations/{stationId}/adSpots`
8. `stations/{stationId}/operators`
9. `stationNowPlaying`
10. `stationAirplayLogs`
11. canonical song-level radio approval fields or equivalent shared approval model

If we try to build the radio system without these being settled, we risk rework in the most important parts of the architecture.

## V1 Recommendation

V1 should implement:

- one station
- one genre
- station settings
- creator approval plus station catalog inclusion
- station playlists
- simple rotations
- commercial insertion every `N` songs
- duration-aware spots
- campaign counters like target plays per day
- shared now playing
- canonical airplay logs

## V2 Direction

V2 can expand into:

- multiple stations
- richer scheduling/dayparting
- weighted and category-based rotations
- business-page self-serve advertising
- chart windows and aggregated ranking
- stronger reporting and analytics
- more advanced operator roles

## Anti-Patterns To Avoid

- treating DJ as a permanent source-of-truth backend
- keeping separate canonical song libraries in DJ
- making now playing or airplay logs DJ-local only
- tying stations to loose standalone user ownership
- overbuilding ad operations before v1 radio workflow is solid
- designing autoplay only as UI logic instead of domain logic
