import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

describe('API request headers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not label an empty DELETE request as JSON', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.deleteReflection('share-code', 'delete-token');

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
