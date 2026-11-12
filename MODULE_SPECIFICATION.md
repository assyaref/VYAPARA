# Module Specification — VYAPARA

## Dashboard

Today’s sales, transactions, profit metrics based on approved
definition, open orders, overdue jobs, low stock, receivables, trends,
sync status.

## Master data

Products: SKU, barcode, name, category, unit, cost, selling price,
optional wholesale tiers, minimum stock, active status. Services: code,
name, unit, pricing formula, minimum charge, additional fees. Customers
and suppliers: contacts, notes, order/purchase history, balances.

## Inventory

Opening stock, stock in/out, adjustment with reason, stock opname, stock
card, low stock alert, receiving, returns, material consumption,
valuation.

## Unified POS

One cart and invoice for ATK, printing, photocopy, laminating, binding,
other services. Customer/walk-in, quantity, unit, specification,
discounts, configurable tax, multiple payments, DP, split payment,
change, receipt/reprint, returns.

## Layanan Dokumen (one menu)

Fotokopi: paper size A4/F4/A3/custom, color/BW, simplex/duplex, page
count, copies, configurable pricing. Laminating: size, quantity,
film/material option, custom size. Jilid: spiral, tape, softcover,
hardcover, size, page count, cover option, quantity. All prices
configurable, no hardcoded production prices.

## Percetakan

Banner width/height in meters, area pricing, minimum charge,
finishing/design fees, materials, file attachment, deadline, production
status, partial delivery. Example: area = width_m × height_m; line total
= max(area × configured price/m2, minimum charge) + configured fees.

## Fulfillment

Each item has independent status and history. One item being ready does
not close the entire order. Partial delivery supported.

## Procurement

Purchase orders, supplier, items, receiving, payments, returns, payable.

## Finance

Cash accounts, cash movement, expenses, receivables, payables, daily
closing, reconciliation. QRIS is manually recorded unless real gateway
integration is implemented.

## Reports

Sales, gross profit, P&L, inventory valuation, stock movement,
purchasing, payables, receivables, print orders, cash flow, CSV/PDF
export. Definitions must be documented and traceable.

## Settings

Store profile, logo, receipt template, tax/rounding, printer, barcode,
pricing, roles, backup, sync, theme.
