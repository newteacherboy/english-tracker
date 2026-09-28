# Migration Phase 1 — Audit Only

This directory contains the first migration step for Diji-Medu.

## Safety contract

- No production data is deleted.
- No existing application flow is changed.
- No Sheet rows are modified.
- The audit is read-only.
- Cleanup is intentionally disabled.
- Any future cleanup must use a separate, reviewed policy and a dry-run first.

## Current target architecture

Google Sheets remains the historical/reporting/source-of-record layer for protected and long-lived learning data.

A future realtime backend may handle live interactions such as presence, active duels, notifications, chat delivery, and transient state.

The migration will be gradual and reversible:
1. Audit
2. Policy approval
3. Backup/verification
4. Shadow writes
5. Read comparison
6. Feature flags
7. Gradual rollout
8. Cleanup only after verification

## Apps Script

`phase1_audit.gs` is designed to be copied into the existing Apps Script project. It only reads spreadsheet metadata/data and writes audit output to the execution log. It does not call `deleteRow`, `clear`, `deleteSheet`, or modify application data.
