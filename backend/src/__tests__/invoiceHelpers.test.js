import { describe, it, expect } from 'vitest';
import { calcTotals, computeStatus } from '../lib/invoiceHelpers.js';

describe('calcTotals', () => {
  it('calcula subtotal, impuesto y total correctamente', () => {
    const items = [
      { importe: 100 },
      { importe: 200 },
    ];
    const result = calcTotals(items);
    expect(result.subtotal).toBe(300);
    expect(result.impuesto).toBe(48);       // 300 * 0.16
    expect(result.total).toBe(348);
  });

  it('redondea a 2 decimales', () => {
    const items = [{ importe: 99.99 }];
    const result = calcTotals(items);
    expect(result.subtotal).toBe(99.99);
    expect(result.impuesto).toBe(16);       // 99.99 * 0.16 = 15.9984 → 16
    expect(result.total).toBe(115.99);
  });

  it('devuelve ceros con lista vacía', () => {
    const result = calcTotals([]);
    expect(result.subtotal).toBe(0);
    expect(result.impuesto).toBe(0);
    expect(result.total).toBe(0);
  });

  it('acepta tasa de impuesto personalizada', () => {
    const items = [{ importe: 1000 }];
    const result = calcTotals(items, 0.08);
    expect(result.subtotal).toBe(1000);
    expect(result.impuesto).toBe(80);
    expect(result.total).toBe(1080);
  });
});

describe('computeStatus', () => {
  it('devuelve "pagada" cuando pagos cubren el total', () => {
    const invoice = {
      total: 348,
      estado: 'enviada',
      fechaVencimiento: null,
      payments: [{ monto: 348 }],
    };
    expect(computeStatus(invoice)).toBe('pagada');
  });

  it('devuelve "pagada" con pagos parciales que suman el total', () => {
    const invoice = {
      total: 200,
      estado: 'enviada',
      fechaVencimiento: null,
      payments: [{ monto: 100 }, { monto: 100 }],
    };
    expect(computeStatus(invoice)).toBe('pagada');
  });

  it('devuelve "vencida" cuando pasó la fecha y no está pagada', () => {
    const invoice = {
      total: 500,
      estado: 'enviada',
      fechaVencimiento: new Date('2020-01-01'),
      payments: [],
    };
    expect(computeStatus(invoice)).toBe('vencida');
  });

  it('NO devuelve "vencida" si ya está marcada como pagada', () => {
    const invoice = {
      total: 500,
      estado: 'pagada',
      fechaVencimiento: new Date('2020-01-01'),
      payments: [{ monto: 500 }],
    };
    expect(computeStatus(invoice)).toBe('pagada');
  });

  it('devuelve el estado original cuando no hay pagos y no está vencida', () => {
    const invoice = {
      total: 500,
      estado: 'borrador',
      fechaVencimiento: new Date('2099-01-01'),
      payments: [],
    };
    expect(computeStatus(invoice)).toBe('borrador');
  });

  it('devuelve el estado original cuando no hay campo payments', () => {
    const invoice = {
      total: 500,
      estado: 'enviada',
      fechaVencimiento: null,
    };
    expect(computeStatus(invoice)).toBe('enviada');
  });
});
