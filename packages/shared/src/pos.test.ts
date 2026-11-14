import { describe, expect, it } from 'vitest';
import { assertMoney, quoteSale, settlePayments, type PaymentLine, type SaleQuote } from './pos';

describe('assertMoney', () => {
  it('accepts valid non-negative integer Rupiah amounts', () => {
    assertMoney(0, 'Nol');
    assertMoney(1, 'Satu');
    assertMoney(1_000_000_000_000, 'Maksimum');
  });

  it('rejects negative amounts', () => {
    expect(() => assertMoney(-1, 'Negatif')).toThrow('harus bilangan bulat Rupiah yang valid');
  });

  it('rejects non-integer amounts', () => {
    expect(() => assertMoney(1000.5, 'Koma')).toThrow('harus bilangan bulat Rupiah yang valid');
    expect(() => assertMoney(NaN, 'NaN')).toThrow('harus bilangan bulat Rupiah yang valid');
  });

  it('rejects amounts above the maximum', () => {
    expect(() => assertMoney(1_000_000_000_001, 'Lebih')).toThrow('harus bilangan bulat Rupiah yang valid');
  });
});

describe('quoteSale', () => {
  const baseLines = [{ quantity: 2, unitPrice: 15_000 }, { quantity: 1, unitPrice: 25_000 }];

  it('computes subtotal, tax and total correctly', () => {
    const result = quoteSale({ lines: baseLines, discountAmount: 0, taxRateBps: 0 });
    expect(result.subtotal).toBe(55_000);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(55_000);
  });

  it('applies discount before tax', () => {
    const result = quoteSale({ lines: baseLines, discountAmount: 5_000, taxRateBps: 1000 }); // 10%
    expect(result.subtotal).toBe(55_000);
    expect(result.discountAmount).toBe(5_000);
    expect(result.taxAmount).toBe(5_000); // 10% of 50_000
    expect(result.total).toBe(55_000);
  });

  it('rounds tax to the nearest Rupiah', () => {
    const result = quoteSale({ lines: [{ quantity: 3, unitPrice: 1_000 }], discountAmount: 0, taxRateBps: 1250 }); // 12.5%
    expect(result.taxAmount).toBe(375);
    expect(result.total).toBe(3_375);
  });

  it('rejects invalid tax rate', () => {
    expect(() => quoteSale({ lines: baseLines, discountAmount: 0, taxRateBps: -1 })).toThrow('Tarif pajak tidak valid');
    expect(() => quoteSale({ lines: baseLines, discountAmount: 0, taxRateBps: 10_001 })).toThrow('Tarif pajak tidak valid');
    expect(() => quoteSale({ lines: baseLines, discountAmount: 0, taxRateBps: 50.5 })).toThrow('Tarif pajak tidak valid');
  });

  it('rejects discount above subtotal', () => {
    expect(() => quoteSale({ lines: baseLines, discountAmount: 56_000, taxRateBps: 0 })).toThrow('Diskon melebihi subtotal');
  });

  it('rejects invalid unit price', () => {
    expect(() => quoteSale({ lines: [{ quantity: 1, unitPrice: -5_000 }], discountAmount: 0, taxRateBps: 0 })).toThrow('harus bilangan bulat Rupiah yang valid');
    expect(() => quoteSale({ lines: [{ quantity: 1, unitPrice: 1000.5 }], discountAmount: 0, taxRateBps: 0 })).toThrow('harus bilangan bulat Rupiah yang valid');
  });

  it('rejects zero or negative quantity', () => {
    expect(() => quoteSale({ lines: [{ quantity: 0, unitPrice: 1_000 }], discountAmount: 0, taxRateBps: 0 })).toThrow('Jumlah barang tidak valid');
    expect(() => quoteSale({ lines: [{ quantity: -2, unitPrice: 1_000 }], discountAmount: 0, taxRateBps: 0 })).toThrow('Jumlah barang tidak valid');
  });

  it('rounds line subtotal and asserts it', () => {
    const result: SaleQuote = quoteSale({ lines: [{ quantity: 1.5, unitPrice: 1_000 }], discountAmount: 0, taxRateBps: 0 });
    expect(result.subtotal).toBe(1_500);
  });
});

type PaymentCase = {
  label: string;
  payments: PaymentLine[];
  quote: SaleQuote;
  expectError?: string;
  expectTotalPaid?: number;
  expectChange?: number;
  expectMethod?: PaymentLine['method'] | 'split';
};

describe('settlePayments', () => {
  const quote: SaleQuote = { subtotal: 100_000, discountAmount: 0, taxAmount: 0, total: 100_000 };

  const run = (payments: PaymentLine[]): ReturnType<typeof settlePayments> => settlePayments(quote, payments);

  it('accepts exact cash payment', () => {
    const result = run([{ method: 'cash', amount: 100_000 }]);
    expect(result.paidAmount).toBe(100_000);
    expect(result.changeAmount).toBe(0);
    expect(result.paymentMethod).toBe('cash');
  });

  it('accepts overpayment and returns change', () => {
    const result = run([{ method: 'cash', amount: 150_000 }]);
    expect(result.changeAmount).toBe(50_000);
    expect(result.paymentMethod).toBe('cash');
  });

  it('accepts multiple payments as split', () => {
    const result = run([{ method: 'cash', amount: 60_000 }, { method: 'transfer', amount: 40_000 }]);
    expect(result.paidAmount).toBe(100_000);
    expect(result.changeAmount).toBe(0);
    expect(result.paymentMethod).toBe('split');
  });

  it('accepts single non-cash payment with its own method', () => {
    const result = run([{ method: 'qris', amount: 100_000 }]);
    expect(result.paymentMethod).toBe('qris');
  });

  it('rejects empty payment list', () => {
    expect(() => run([])).toThrow('Pembayaran wajib diisi');
  });

  it('rejects zero nominal', () => {
    expect(() => run([{ method: 'cash', amount: 0 }])).toThrow('Nominal pembayaran harus lebih dari nol');
  });

  it('rejects non-integer or negative nominal', () => {
    expect(() => run([{ method: 'cash', amount: 50_000.5 }])).toThrow('harus bilangan bulat Rupiah yang valid');
    expect(() => run([{ method: 'cash', amount: -10_000 }])).toThrow('harus bilangan bulat Rupiah yang valid');
  });

  it('rejects unknown payment method', () => {
    expect(() => run([{ method: 'kartu_kredit' as any, amount: 100_000 }])).toThrow('Metode pembayaran tidak dikenal');
  });

  it('rejects payment less than total', () => {
    expect(() => run([{ method: 'cash', amount: 90_000 }])).toThrow('Pembayaran kurang dari total');
  });

  it('rejects non-cash payments exceeding total', () => {
    expect(() => run([{ method: 'transfer', amount: 150_000 }])).toThrow('Pembayaran non-tunai tidak boleh melebihi total');
  });
});
