# Base44 → GitHub migration notes

## Current state
The live system is a Base44 app with S3-backed source. Direct source export is unavailable from the current Base44 workspace because sandbox/file access requires the Builder plan.

## Preserved functional scope
- Students
- Fees and collections
- Payments / receipts
- Expenses
- Staff
- Attendance
- Inventory and stock movements
- Supply requests and approvals
- Discounts / exemptions
- Notifications
- Audit log
- Users and role-based permissions

## Roles
- مدير النظام
- مدير المدرسة
- محاسب
- أمين المستودع
- مشرف/معلم

## Migration approach
1. Create a private GitHub repository named `alribat-school-system`.
2. Push this scaffold as the baseline.
3. Choose the production database (recommended: PostgreSQL/Supabase or equivalent).
4. Create migrations for the 13 Base44 entities.
5. Export live Base44 data when export access is available.
6. Import and validate data row counts and financial balances.
7. Add authentication and server-side authorization.
8. Run acceptance tests before switching users from Base44.

## Data privacy and financial integrity
This repository intentionally contains no live student, staff, or financial records. During production migration, validate row counts, fee/payment reconciliation, and opening balances before cutover.
