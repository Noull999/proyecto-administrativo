import { describe, it, expect } from 'vitest';
import { parsePagination, paginatedResponse } from '../lib/pagination.js';

describe('parsePagination', () => {
  it('devuelve defaults cuando no hay params', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('calcula skip correctamente para página 2', () => {
    const result = parsePagination({ page: '2', limit: '10' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(10);
    expect(result.take).toBe(10);
  });

  it('clamp: page mínima es 1', () => {
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('clamp: limit máximo es 100', () => {
    const result = parsePagination({ limit: '999' });
    expect(result.limit).toBe(100);
    expect(result.take).toBe(100);
  });

  it('limit: 0 se trata como "sin especificar" y usa default 20', () => {
    // parseInt('0') = 0 que es falsy → cae al default || 20
    const result = parsePagination({ limit: '0' });
    expect(result.limit).toBe(20);
  });

  it('ignora valores no numéricos y usa defaults', () => {
    const result = parsePagination({ page: 'abc', limit: 'xyz' });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe('paginatedResponse', () => {
  it('construye la respuesta correctamente', () => {
    const data = [1, 2, 3];
    const result = paginatedResponse(data, 50, 1, 20);
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.pagination.total).toBe(50);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.pages).toBe(3); // ceil(50/20) = 3
  });

  it('calcula pages = 1 cuando total <= limit', () => {
    const result = paginatedResponse([], 5, 1, 20);
    expect(result.pagination.pages).toBe(1);
  });

  it('calcula pages = 0 cuando total es 0', () => {
    const result = paginatedResponse([], 0, 1, 20);
    expect(result.pagination.pages).toBe(0);
  });
});
