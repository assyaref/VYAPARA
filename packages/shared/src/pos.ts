export const PAYMENT_METHODS = ['cash', 'transfer', 'qris', 'debit', 'credit'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentLine = {
  method: PaymentMethod;
  amount: number;
};

export type SaleQuote = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
};

export type Settlement = SaleQuote & {
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod | 'split';
};

const MONEY_MAX = 1_000_000_000_000;

export function assertMoney(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > MONEY_MAX) {
    throw new Error(`${label} harus bilangan bulat Rupiah yang valid`);
  }
}

export function quoteSale(input: {
  lines: { quantity: number; unitPrice: number }[];
  discountAmount: number;
  taxRateBps: number;
}): SaleQuote {
  if (!Number.isInteger(input.taxRateBps) || input.taxRateBps < 0 || input.taxRateBps > 10_000) {
    throw new Error('Tarif pajak tidak valid');
  }
  assertMoney(input.discountAmount, 'Diskon');
  let subtotal = 0;
  for (const line of input.lines) {
    assertMoney(line.unitPrice, 'Harga');
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error('Jumlah barang tidak valid');
    }
    const lineTotal = Math.round(line.quantity * line.unitPrice);
    assertMoney(lineTotal, 'Subtotal baris');
    subtotal += lineTotal;
  }
  assertMoney(subtotal, 'Subtotal');
  if (input.discountAmount > subtotal) {
    throw new Error('Diskon melebihi subtotal');
  }
  const taxable = subtotal - input.discountAmount;
  const taxAmount = Math.round((taxable * input.taxRateBps) / 10_000);
  const total = taxable + taxAmount;
  return {
    subtotal,
    discountAmount: input.discountAmount,
    taxAmount,
    total,
  };
}

export function settlePayments(quote: SaleQuote, payments: PaymentLine[]): Settlement {
  if (payments.length === 0) {
    throw new Error('Pembayaran wajib diisi');
  }
  let paidAmount = 0;
  let nonCash = 0;
  for (const payment of payments) {
    assertMoney(payment.amount, 'Nominal pembayaran');
    if (payment.amount === 0) {
      throw new Error('Nominal pembayaran harus lebih dari nol');
    }
    if (!PAYMENT_METHODS.includes(payment.method)) {
      throw new Error('Metode pembayaran tidak dikenal');
    }
    paidAmount += payment.amount;
    if (payment.method !== 'cash') {
      nonCash += payment.amount;
    }
  }
  assertMoney(paidAmount, 'Total bayar');
  if (paidAmount < quote.total) {
    throw new Error('Pembayaran kurang dari total');
  }
  if (nonCash > quote.total) {
    throw new Error('Pembayaran non-tunai tidak boleh melebihi total');
  }
  const first = payments[0];
  if (!first) {
    throw new Error('Pembayaran wajib diisi');
  }
  return {
    ...quote,
    paidAmount,
    changeAmount: paidAmount - quote.total,
    paymentMethod: payments.length === 1 ? first.method : 'split',
  };
}
