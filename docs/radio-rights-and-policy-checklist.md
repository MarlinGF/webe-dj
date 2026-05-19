# Radio Rights And Policy Checklist

## Purpose

This document captures the v1 rights, policy, and operational safeguards that should exist for `We-be Radio` before implementation or launch.

This is not legal advice. It is a product and architecture planning checklist intended to reduce risk and make the intended responsibility model explicit.

## Core Position

- We-be Radio should not operate as an open station for arbitrary third-party music.
- V1 should be limited to music uploaded by We-be artists/pages and explicitly approved for radio play inside the We-be ecosystem.
- We-be should require artists to affirm they have the rights needed to upload and authorize radio play for their music.
- Station operators should be required to use only properly authorized station inventory.
- These agreements can shift contractual responsibility toward artists/operators, but they do not guarantee full legal immunity for the platform.

## Recommended V1 Risk Posture

- Restrict station-playable inventory to songs from We-be artists/pages.
- Require a distinct artist approval step for radio play.
- Do not allow stations to ingest arbitrary outside music as normal workflow in v1.
- Keep canonical records of:
  - who uploaded the song
  - who approved it for radio
  - which station included it
  - who aired it
  - when it aired
- Maintain a takedown path and a repeat-infringer policy.

## Required Product Rules

### 1. Upload Rule

Artists/pages uploading songs should be required to affirm that:

- they own the music or control the rights needed to upload it
- they have the right to authorize platform distribution and radio-style playback
- the upload does not infringe third-party rights

### 2. Radio Approval Rule

The artist/page approving a song for radio should be required to affirm that:

- they authorize We-be Radio to include the song in station programming
- they understand the song may be aired through station automation and related listener surfaces
- they remain responsible for ensuring the rights they claim are valid

### 3. Station Operator Rule

Station owners/operators should be required to affirm that:

- they will only program music authorized through the We-be station catalog flow
- they will not bypass approval controls with unauthorized content
- they understand unauthorized programming can lead to suspension/removal

### 4. Enforcement Rule

We-be should reserve the right to:

- remove songs from radio eligibility
- suspend or terminate station/operator access
- remove infringing content on notice
- suspend repeat infringers

## Terms / Policy Topics To Cover

These should be handled in We-be’s legal/policy surfaces with counsel review:

- representations and warranties about rights ownership/control
- radio-play authorization language
- indemnification
- takedown procedure
- repeat infringer policy
- right to suspend/remove content and accounts
- no obligation to keep disputed content live
- platform discretion over station inclusion and removal

## Recommended Data / Audit Fields

These should be considered part of the shared radio/canonical model.

### Canonical song-level fields or equivalents

- `uploadedBy`
- `uploadedAt`
- `rightsAffirmed`
- `rightsAffirmedAt`
- `rightsAffirmedBy`
- `radioApprovalStatus`
- `radioApprovedAt`
- `radioApprovedBy`
- `radioApprovalVersion`
- `radioRestrictions`

### Station catalog audit fields

- `included`
- `includedAt`
- `includedBy`
- `removedAt`
- `removedBy`
- `eligibilityNotes`

### Airplay / reporting fields

- `stationId`
- `songId`
- `playedAt`
- `operatorId`
- `playlistId`
- `rotationId`
- `sourceType`

### Compliance / enforcement records

Possible future models:

- `copyrightNotices`
- `radioEligibilityActions`
- `policyAcknowledgements`

These do not all need to exist in v1, but the system should leave room for them.

## Recommended V1 Operational Guardrails

- Only allow autoplay from station catalog, not from arbitrary uploaded local files.
- Require creator approval before station catalog inclusion.
- Make radio-play approval reversible.
- Remove disputed songs from station eligibility quickly.
- Keep airplay logs append-only.
- Preserve audit trails for approval, inclusion, and playback.

## Suggested Responsibility Model

### Artists / pages

Responsible for:

- having the rights they claim
- the truthfulness of their upload and radio-approval affirmations

### Station operators

Responsible for:

- using only station-approved inventory
- not bypassing approved radio workflows

### We-be platform

Responsible for:

- maintaining approval controls
- enforcing policy
- responding to notices/takedowns
- keeping audit records

## What Not To Assume

- A checkbox alone is not complete protection.
- Terms alone do not eliminate platform risk.
- “The artist said they owned it” is not enough reason to skip enforcement and takedown processes.
- Active curation/broadcasting can create more risk than a purely passive content host.

## Strong V1 Recommendation

For v1, the safest practical product rule is:

- We-be Radio only airs songs uploaded by We-be artists/pages
- those artists/pages must explicitly approve the songs for radio play
- stations may only use songs included through the shared station catalog workflow

This keeps the catalog closed and auditable while the rights/compliance model matures.

## Before Launch

Before launch, review with counsel:

- upload terms
- radio approval language
- station operator terms
- DMCA/takedown process
- repeat infringer policy
- any public-facing language about music rights, artist authorizations, and broadcaster responsibilities
