import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import {
  createRole,
  createUser,
  deactivateRole,
  deactivateUser,
  listPermissions,
  listRoles,
  listSettings,
  listUsers,
  updateRole,
  updateUser,
  upsertSetting,
} from './admin';

function createDb(): AppDatabase {
  return new AppDatabase(':memory:');
}

function seedRole(db: AppDatabase, name: string) {
  return createRole(db, { name, description: `Role ${name}` });
}

describe('admin - user management', () => {
  it('creates a user and assigns a role', () => {
    const db = createDb();
    const user = createUser(db, {
      name: 'Kasir Satu',
      email: 'Kasir@Vyapara.com',
      password: 'rahasia123456',
      roleId: 'role-cashier',
    });
    expect(user.email).toBe('kasir@vyapara.com');
    expect(user.roleId).toBe('role-cashier');
    expect(user.roleName).toBe('cashier');
    expect(user.isActive).toBe(true);
    expect(user.id).toBeTypeOf('string');
  });

  it('rejects duplicate email', () => {
    const db = createDb();
    createUser(db, {
      name: 'Kasir Satu',
      email: 'kasir@vyapara.com',
      password: 'rahasia123456',
      roleId: 'role-cashier',
    });
    expect(() =>
      createUser(db, {
        name: 'Kasir Dua',
        email: 'KASIR@vyapara.com',
        password: 'rahasia123456',
        roleId: 'role-cashier',
      }),
    ).toThrow(AppError);
  });

  it('rejects unknown role', () => {
    const db = createDb();
    expect(() =>
      createUser(db, {
        name: 'Kasir Satu',
        email: 'kasir@vyapara.com',
        password: 'rahasia123456',
        roleId: 'role-tidak-ada',
      }),
    ).toThrow(AppError);
  });

  it('lists users with filters', () => {
    const db = createDb();
    createUser(db, { name: 'Budi', email: 'budi@vyapara.com', password: 'rahasia123456', roleId: 'role-cashier' });
    createUser(db, { name: 'Siti', email: 'siti@vyapara.com', password: 'rahasia123456', roleId: 'role-viewer' });

    const all = listUsers(db);
    expect(all).toHaveLength(2);

    const cashiers = listUsers(db, { roleId: 'role-cashier' });
    expect(cashiers).toHaveLength(1);
    expect(cashiers[0]!.name).toBe('Budi');

    const found = listUsers(db, { search: 'siti' });
    expect(found).toHaveLength(1);

    const limited = listUsers(db, { limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it('updates a user', () => {
    const db = createDb();
    const user = createUser(db, {
      name: 'Budi',
      email: 'budi@vyapara.com',
      password: 'rahasia123456',
      roleId: 'role-cashier',
    });
    const updated = updateUser(db, { id: user.id, name: 'Budi Utomo', roleId: 'role-viewer' });
    expect(updated.name).toBe('Budi Utomo');
    expect(updated.roleId).toBe('role-viewer');
    expect(updated.roleName).toBe('viewer');
  });

  it('rejects updating unknown user and duplicate email', () => {
    const db = createDb();
    const u1 = createUser(db, { name: 'A', email: 'a@vyapara.com', password: 'rahasia123456', roleId: 'role-cashier' });
    createUser(db, { name: 'B', email: 'b@vyapara.com', password: 'rahasia123456', roleId: 'role-cashier' });

    expect(() => updateUser(db, { id: 'tidak-ada', name: 'X' })).toThrow(AppError);
    expect(() => updateUser(db, { id: u1.id, email: 'B@vyapara.com' })).toThrow(AppError);
  });

  it('deactivates a user', () => {
    const db = createDb();
    const user = createUser(db, { name: 'A', email: 'a@vyapara.com', password: 'rahasia123456', roleId: 'role-cashier' });
    expect(() => deactivateUser(db, user.id)).not.toThrow();
    expect(() => deactivateUser(db, 'tidak-ada')).toThrow(AppError);
  });
});

describe('admin - role management', () => {
  it('lists seeded roles', () => {
    const db = createDb();
    const roles = listRoles(db);
    expect(roles.map((r) => r.name).sort()).toEqual(['admin', 'cashier', 'viewer']);
  });

  it('creates and updates roles', () => {
    const db = createDb();
    const role = seedRole(db, 'gudang');
    expect(role.name).toBe('gudang');
    expect(role.description).toBe('Role gudang');

    const updated = updateRole(db, { id: role.id, description: 'Gudang barangan' });
    expect(updated.description).toBe('Gudang barangan');

    const renamed = updateRole(db, { id: role.id, name: ' gudang baru ' });
    expect(renamed.name).toBe('gudang baru');
  });

  it('rejects duplicate role names and unknown roles', () => {
    const db = createDb();
    seedRole(db, 'gudang');
    expect(() => createRole(db, { name: ' GUDANG ' })).toThrow(AppError);
    expect(() => updateRole(db, { id: 'tidak-ada', name: 'X' })).toThrow(AppError);
    expect(() => deactivateRole(db, 'tidak-ada')).toThrow(AppError);
  });

  it('deactivates a role without removing it', () => {
    const db = createDb();
    const role = seedRole(db, 'gudang');
    expect(() => deactivateRole(db, role.id)).not.toThrow();
    const stillThere = listRoles(db).find((r) => r.id === role.id);
    expect(stillThere).toBeDefined();
  });
});

describe('admin - permissions and settings', () => {
  it('lists all permissions', () => {
    const db = createDb();
    const permissions = listPermissions(db);
    expect(permissions.map((p) => p.name)).toContain('product:write');
    expect(permissions.map((p) => p.name)).toContain('transaction:write');
  });

  it('upserts and lists settings', () => {
    const db = createDb();
    const first = upsertSetting(db, { key: 'tax_rate_bps', value: '1100' });
    expect(first.value).toBe('1100');

    const second = upsertSetting(db, { key: 'tax_rate_bps', value: '1500' });
    expect(second.value).toBe('1500');

    const all = listSettings(db).filter((s) => s.key === 'tax_rate_bps');
    expect(all).toHaveLength(1);
    expect(all[0]!.key).toBe('tax_rate_bps');
    expect(all[0]!.value).toBe('1500');
  });
});
