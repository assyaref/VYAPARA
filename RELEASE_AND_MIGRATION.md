# Release, Backup, and Supabase-to-VPS Migration

## Windows release

Test installer on clean Windows account. Keep DB in user-data folder.
Verify upgrades preserve data. Document uninstall/data retention. Test
icon, shortcut, startup, and app shutdown.

## Backup

Manual and scheduled backup. Use SQLite-consistent backup method,
integrity check, retention, restore to isolated environment. Protect
backup files; document recovery.

## Supabase

Separate dev/staging/production. Versioned migrations. RLS on all
user-accessible tables. Test anonymous, cashier, admin, owner. Storage
private by default. No service-role key in client.

## VPS target

Node.js TypeScript API, PostgreSQL, Drizzle, auth service, S3-compatible
private storage, TLS reverse proxy, firewall, monitoring, automated
backups, deployment secrets.

## Migration sequence

1.  Provision/harden VPS.
2.  Install PostgreSQL and least-privilege user.
3.  Apply schema migrations.
4.  Export Supabase data consistently.
5.  Import and validate row counts/relations/totals.
6.  Copy Storage objects and verify checksums.
7.  Plan user/auth migration.
8.  Test API, permissions, and reports.
9.  Freeze old cloud writes at cutover.
10. Drain local outbox.
11. Transfer final delta.
12. Switch provider configuration.
13. Verify sync/dashboard.
14. Keep old backend read-only during rollback window.

## Auth migration

Do not assume Supabase password hashes are directly portable. Plan
supported credential migration or password reset. Map user IDs/roles and
revoke old sessions.

## Rollback

Keep verified backup and old cloud read-only. Avoid untested dual
writes. Reconcile transactions created after cutover before reopening
old backend.

## Release checklist

Tests, migration, backup/restore, secrets review, installer, release
notes, known issues, rollback guide.
