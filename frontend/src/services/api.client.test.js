import { describe, it, expect, vi } from 'vitest';

describe('API Client (Chunk G)', () => {
  it('get function exists and is a function', () => {
    const { get } = require('../services/api.client');
    expect(typeof get).toBe('function');
  });

  it('post function exists and is a function', () => {
    const { post } = require('../services/api.client');
    expect(typeof post).toBe('function');
  });

  it('put function exists and is a function', () => {
    const { put } = require('../services/api.client');
    expect(typeof put).toBe('function');
  });

  it('del function exists and is a function', () => {
    const { del } = require('../services/api.client');
    expect(typeof del).toBe('function');
  });
});