import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { setupAdmin } from './auth';
import {
  closeCashDrawer,
  getCashFlow,
  getCashDrawer,
  getProfitAndLoss,
  listCashDrawers,
  listCashMovements,
  listExpenseRecords,
  listIncomeRecords,
  openCashDrawer,
  recordCashMovement,
  recordExpense,
  recordIncome,
} from './finance';

function createDb(): AppDatabase {
  return new AppDatabase(':memory:');
}

function seedContext(db: AppDatabase) {
  const { user } = setupAdmin(db, {
    name: 'Administrator',
    email: 'admin@vyapara.com',
    password: 'rahasia123456',
  });
  return { userId: user.id };
}

describe('finance', () => {
  it('opens and closes a cash drawer', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const drawer = openCashDrawer(db, { userId, openingBalance: 1_000_000, notes: 'Buka harian' });
    expect(drawer.status).toBe('open');
    expect(drawer.openingBalance).toBe(1_000_000);
    expect(drawer.closingBalance).toBe(1_000_000);
    expect(drawer.closedAt).toBeNull();

    const closed = closeCashDrawer(db, {
      cashDrawerId: drawer.id,
      closingBalance: 1_250_000,
      notes: 'Tutup harian',
      userId,
    });
    expect(closed.status).toBe('closed');
    expect(closed.closingBalance).toBe(1_250_000);
    expect(closed.closedAt).toBeDefined();
    expect(getCashDrawer(db, drawer.id)!.status).toBe('closed');
  });

  it('enforces drawer rules', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    openCashDrawer(db, { userId, openingBalance: 500_000 });
    expect(() => openCashDrawer(db, { userId, openingBalance: 500_000 })).toThrow(AppError);
    expect(() => closeCashDrawer(db, { cashDrawerId: 'tidak-ada', closingBalance: 100, userId })).toThrow(
      AppError,
    );

    const drawer = getCashDrawer(db, listCashDrawers(db)[0]!.id)!;
    expect(() =>
      closeCashDrawer(db, { cashDrawerId: drawer.id, closingBalance: 100, userId: 'lain' }),
    ).toThrow(AppError);
    expect(() => closeCashDrawer(db, { cashDrawerId: drawer.id, closingBalance: 100, userId })).toThrow(
      AppError,
    );
  });

  it('records cash movements only on open drawers', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const drawer = openCashDrawer(db, { userId, openingBalance: 500_000 });
    const movement = recordCashMovement(db, {
      cashDrawerId: drawer.id,
      movementType: 'income',
      amount: 200_000,
      description: 'Penjualan tunai',
      createdBy: userId,
    });
    expect(movement.amount).toBe(200_000);
    expect(listCashMovements(db, { cashDrawerId: drawer.id })).toHaveLength(1);

    closeCashDrawer(db, { cashDrawerId: drawer.id, closingBalance: 700_000, userId });
    expect(() =>
      recordCashMovement(db, {
        cashDrawerId: drawer.id,
        movementType: 'expense',
        amount: 50_000,
        createdBy: userId,
      }),
    ).toThrow(AppError);
  });

  it('records income and expenses', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const income = recordIncome(db, {
      incomeType: 'jual_sisa',
      amount: 150_000,
      description: 'Jual barang bekas',
      createdBy: userId,
    });
    expect(income.incomeType).toBe('jual_sisa');
    expect(listIncomeRecords(db)).toHaveLength(1);

    const expense = recordExpense(db, {
      category: 'listrik',
      amount: 75_000,
      description: 'Tagihan listrik',
      createdBy: userId,
    });
    expect(expense.category).toBe('listrik');
    expect(listExpenseRecords(db, { category: 'listrik' })).toHaveLength(1);
  });

  it('computes profit and loss and cash flow', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const drawer = openCashDrawer(db, { userId, openingBalance: 1_000_000 });
    recordIncome(db, { incomeType: 'jual', amount: 400_000, createdBy: userId, cashDrawerId: drawer.id });
    recordExpense(db, { category: 'bahan_bakar', amount: 120_000, createdBy: userId, cashDrawerId: drawer.id });

    const pl = getProfitAndLoss(db, {});
    expect(pl.totalIncome).toBe(400_000);
    expect(pl.totalExpense).toBe(120_000);
    expect(pl.grossProfit).toBe(280_000);

    const cf = getCashFlow(db, {});
    expect(cf.openingBalance).toBe(1_000_000);
    expect(cf.totalIncome).toBe(400_000);
    expect(cf.totalExpense).toBe(120_000);
    expect(cf.closingBalance).toBe(1_280_000);
    expect(cf.movements).toHaveLength(2);
  });
});
