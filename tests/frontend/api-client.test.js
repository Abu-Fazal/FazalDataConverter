import { get, post, put, del } from '../../frontend/src/services/api.client.js';

describe('API Client', () => {
  it('get is a function', () => {
    expect(typeof get).toBe('function');
  });

  it('post is a function', () => {
    expect(typeof post).toBe('function');
  });

  it('put is a function', () => {
    expect(typeof put).toBe('function');
  });

  it('del is a function', () => {
    expect(typeof del).toBe('function');
  });
});