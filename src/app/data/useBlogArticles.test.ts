import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchArticle, bumpView, bumpLike } from './useBlogArticles';

/**
 * Regression guard for the public-blog 401 outage: the Supabase gateway
 * verifies a JWT on every function request, so these public endpoints MUST
 * send an `Authorization: Bearer …` header. If a future edit drops it, the
 * gateway returns 401 before the function runs and the blog goes empty.
 */
function authHeaderOf(call: unknown[]): string | undefined {
  const init = call[1] as RequestInit | undefined;
  const h = init?.headers as Record<string, string> | undefined;
  return h?.Authorization;
}

describe('useBlogArticles public fetches send the anon-key auth header', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchArticle sends a Bearer Authorization header', async () => {
    await fetchArticle('some-slug');
    expect(fetchMock).toHaveBeenCalled();
    expect(authHeaderOf(fetchMock.mock.calls[0])).toMatch(/^Bearer /);
  });

  it('bumpView POSTs with a Bearer Authorization header', async () => {
    await bumpView('some-slug');
    const call = fetchMock.mock.calls[0];
    expect((call[1] as RequestInit).method).toBe('POST');
    expect(authHeaderOf(call)).toMatch(/^Bearer /);
  });

  it('bumpLike POSTs with a Bearer Authorization header', async () => {
    await bumpLike('some-slug', 'up');
    const call = fetchMock.mock.calls[0];
    expect((call[1] as RequestInit).method).toBe('POST');
    expect(authHeaderOf(call)).toMatch(/^Bearer /);
  });
});
