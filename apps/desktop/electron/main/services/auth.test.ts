import { describe, expect, it, beforeEach } from 'vitest';
import { PERMISSIONS } from 'vyapara-shared';
import { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import {
  assertPermission,
  changePassword,
  login,
  logout,
  needsSetup,
  readSession,
  requireUser,
  resetAuthRateLimit,
  setupAdmin,
} from './auth';

function createDb(): AppDatabase {
  return new AppDatabase(':memory:');
}

function seedAdmin(db: AppDatabase) {
  return setupAdmin(db, {
    name: 'Administrator',
    email: 'Admin@Vyapara.com',
    password: 'rahasia123456',
  });
}

describe('auth service', () => {
  beforeEach(() => {
    resetAuthRateLimit();
  });

  describe('needsSetup / setupAdmin', () => {
    it('reports setup needed on a fresh database', () => {
      const db = createDb();
      expect(needsSetup(db)).toBe(true);
    });

    it('creates the administrator with full permissions', () => {
      const db = createDb();
      const result = seedAdmin(db);
      expect(result.user.email).toBe('admin@vyapara.com');
      expect(result.user.role).toBe('admin');
      expect(result.user.permissions.sort()).toEqual([...PERMISSIONS].sort());
      expect(result.token).toBeTypeOf('string');
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('rejects setup after administrator exists', () => {
      const db = createDb();
      seedAdmin(db);
      expect(() =>
        setupAdmin(db, { name: 'Lain', email: 'lain@vyapara.com', password: 'rahasia123456' }),
      ).toThrow(AppError);
    });

    it('rejects password shorter than 10 characters', () => {
      const db = createDb();
      expect(() =>
        setupAdmin(db, { name: 'A', email: 'a@vyapara.com', password: 'pendek' }),
      ).toThrow(AppError);
    });

    it('rejects password equal to email', () => {
      const db = createDb();
      expect(() =>
        setupAdmin(db, { name: 'A', email: 'x@vyapara.com', password: 'x@vyapara.com' }),
      ).toThrow(AppError);
    });

    it('normalizes email to lowercase', () => {
      const db = createDb();
      const result = seedAdmin(db);
      expect(result.user.email).toBe('admin@vyapara.com');
    });
  });

  describe('login', () => {
    it('logs in with correct password (case-insensitive email)', () => {
      const db = createDb();
      seedAdmin(db);
      const result = login(db, { email: 'ADMIN@VYAPARA.COM', password: 'rahasia123456' });
      expect(result.user.email).toBe('admin@vyapara.com');
      expect(result.user.role).toBe('admin');
      expect(result.token).toBeTypeOf('string');
    });

    it('rejects wrong password', () => {
      const db = createDb();
      seedAdmin(db);
      expect(() => login(db, { email: 'admin@vyapara.com', password: 'salah123456' })).toThrow(
        AppError,
      );
    });

    it('rejects unknown email', () => {
      const db = createDb();
      seedAdmin(db);
      expect(() => login(db, { email: 'tidakada@vyapara.com', password: 'rahasia123456' })).toThrow(
        AppError,
      );
    });

    it('locks after repeated failures and rate-limits further attempts', () => {
      const db = createDb();
      seedAdmin(db);
      for (let i = 0; i < 8; i++) {
        expect(() => login(db, { email: 'admin@vyapara.com', password: 'salah' })).toThrow(
          AppError,
        );
      }
      expect(() => login(db, { email: 'admin@vyapara.com', password: 'rahasia123456' })).toThrow(
        AppError,
      );
    });

    it('clears rate limit after resetAuthRateLimit', () => {
      const db = createDb();
      seedAdmin(db);
      for (let i = 0; i < 8; i++) {
        try {
          login(db, { email: 'admin@vyapara.com', password: 'salah' });
        } catch {
          // expected
        }
      }
      resetAuthRateLimit();
      const result = login(db, { email: 'admin@vyapara.com', password: 'rahasia123456' });
      expect(result.user.email).toBe('admin@vyapara.com');
    });
  });

  describe('sessions', () => {
    it('reads a valid session', () => {
      const db = createDb();
      const { token } = seedAdmin(db);
      const user = readSession(db, token);
      expect(user).not.toBeNull();
      expect(user?.id).toBeDefined();
      expect(user?.permissions).toContain('transaction:write');
    });

    it('returns null for unknown token', () => {
      const db = createDb();
      expect(readSession(db, 'unknown-token')).toBeNull();
    });

    it('requireUser throws for invalid session', () => {
      const db = createDb();
      expect(() => requireUser(db, 'invalid')).toThrow(AppError);
    });

    it('requireUser returns the user for valid session', () => {
      const db = createDb();
      const { token } = seedAdmin(db);
      const user = requireUser(db, token);
      expect(user.email).toBe('admin@vyapara.com');
    });

    it('logout revokes the session', () => {
      const db = createDb();
      const { token } = seedAdmin(db);
      logout(db, token);
      expect(readSession(db, token)).toBeNull();
    });
  });

  describe('authorization', () => {
    it('assertPermission allows admin any permission', () => {
      const db = createDb();
      const { user } = seedAdmin(db);
      expect(() => assertPermission(user, 'database:restore')).not.toThrow();
      expect(() => assertPermission(user, 'inventory:approve')).not.toThrow();
    });

    it('assertPermission throws FORBIDDEN for missing permission', () => {
      const viewerUser = {
        id: 'u-1',
        name: 'Viewer',
        email: 'viewer@vyapara.com',
        role: 'viewer',
        permissions: ['product:read'],
        mustChangePassword: false,
      };
      expect(() => assertPermission(viewerUser, 'product:write')).toThrow(AppError);
      expect(() => assertPermission(viewerUser, 'transaction:write')).toThrow(AppError);
    });

    it('throws PASSWORD_CHANGE_REQUIRED when mustChangePassword is set', () => {
      const db = createDb();
      seedAdmin(db);
      db.sqlite.prepare("UPDATE users SET must_change_password = 1 WHERE email = 'admin@vyapara.com'").run();
      const { token } = login(db, { email: 'admin@vyapara.com', password: 'rahasia123456' });
      const refreshed = readSession(db, token)!;
      expect(refreshed.mustChangePassword).toBe(true);
      expect(() => assertPermission(refreshed, 'product:read')).toThrow(AppError);
    });
  });

  describe('changePassword', () => {
    it('rejects wrong current password', () => {
      const db = createDb();
      const { token } = seedAdmin(db);
      expect(() => changePassword(db, token, 'salah123456', 'baru12345678')).toThrow(AppError);
    });

    it('rejects new password equal to current', () => {
      const db = createDb();
      const { token } = seedAdmin(db);
      expect(() => changePassword(db, token, 'rahasia123456', 'rahasia123456')).toThrow(AppError);
    });

    it('rejects weak new password', () => {
      const db = createDb();
      const { token } = seedAdmin(db);
      expect(() => changePassword(db, token, 'rahasia123456', 'pendek')).toThrow(AppError);
    });

    it('changes password and revokes old session', () => {
      const db = createDb();
      const { token } = seedAdmin(db);
      const next = changePassword(db, token, 'rahasia123456', 'baru12345678');
      expect(next.token).not.toBe(token);
      expect(readSession(db, token)).toBeNull();
      const again = login(db, { email: 'admin@vyapara.com', password: 'baru12345678' });
      expect(again.user.email).toBe('admin@vyapara.com');
    });
  });
});
