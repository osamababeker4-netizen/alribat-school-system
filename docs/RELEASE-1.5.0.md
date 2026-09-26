# Alribat School System v1.5.0

Release date: 2026-09-26

## Highlights
- New central employee check-in/check-out module.
- Daily staff status: present, absent, leave, excused.
- Automatic time capture and worked-duration display.
- Staff attendance CSV export and dashboard indicators.
- Central Supabase synchronization support for the new module.
- Improved responsive layout and operational UI polish.
- Login/release/version markers updated to 1.5.0.
- Ownership notice and approved signature retained.

## Production rollout
The matching Supabase migration is:
`supabase/migrations/20260926224500_staff_attendance_v150.sql`

The live deployment smoke test expects `app-version=1.5.0`.
