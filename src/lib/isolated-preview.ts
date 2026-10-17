import { initialConversation, applyFacts, confirmCharity, extractImmediate, advance, nextQuestion, normaliseConversation } from "./onboarding/state";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Synthetic, stateless Preview services. No DB, email, payment, model or research calls. */
export async function isolatedPreviewResponse(request: NextRequest) {
  const key = process.env.SORP_PREVIEW_COOKIE_SECRET;
  const json = (body: unknown, status = 200, cookie?: string) => Response.json(body, { status, headers: { "cache-control": "private, no-store", "x-sorp-isolation": "synthetic", ...(cookie ? { "set-cookie": cookie } : {}) } });
  if (!key) return json({ error: "Isolated Preview is not configured." }, 503);
  const requestOrigin = `${request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')}://${request.headers.get('host') || request.nextUrl.host}`;
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.get('origin') && request.headers.get('origin') !== requestOrigin)) return json({ error: "Use this Preview to submit test data." }, 403);
    if (Number(request.headers.get('content-length') || 0) > 100_000) return json({ error: "Test request is too large." }, 413);
  }
  const sign = (payload: string) => createHmac('sha256', key).update(payload).digest('base64url');
  const raw = request.cookies.get('sorp_preview_account')?.value || '';
  let stored: { account: { id: string; name: string; email: string; position: string; organisation: string }; progress: Record<string, unknown> } | null = null;
  try {
    const [payload, signature] = raw.split('.');
    const expected = sign(payload);
    if (signature?.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) stored = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch { /* Invalid synthetic cookie stays anonymous. */ }
  const path = request.nextUrl.pathname.replace(/\/$/, '');
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const access = { founder: false, memberships: [], synthetic: true };
  if (path === '/api/readiness-account') {
    if (request.method === 'GET') return json(stored ? { signedIn: true, authProvider: 'sorp', ...stored, platformAccess: access } : { signedIn: false });
    if (body.action === 'logout') return json({ signedIn: false }, 200, 'sorp_preview_account=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    if (body.action === 'signup' || body.action === 'login') {
      if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || typeof body.password !== 'string' || body.password.length < 10) return json({ error: 'Add a valid test email and password.' }, 400);
      const account = { id: 'synthetic-preview-account', name: String(body.name || 'Returning Test User'), email: body.email.toLowerCase(), position: String(body.position || 'Trustee'), organisation: String(body.organisation || 'Synthetic Charity') };
      // Only the synthetic profile is stored in this browser. Passwords never persist.
      const progress = body.action === 'signup' ? { onboarding: { facts: body.progress?.onboarding?.facts, selected: body.progress?.onboarding?.selected } } : { sessionId: 'synthetic-saved-review', step: 'scope', onboarding: {} };
      const payload = Buffer.from(JSON.stringify({ account, progress })).toString('base64url');
      return json({ signedIn: true, account, progress, platformAccess: access }, 200, `sorp_preview_account=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${request.nextUrl.protocol === 'https:' ? '; Secure' : ''}`);
    }
    if (!stored) return json({ signedIn: false, error: 'Sign in to the synthetic account.' }, 401);
    if (body.action === 'update-profile') {
      if (typeof body.position !== 'string' || typeof body.organisation !== 'string' || body.position.length > 120 || body.organisation.length > 180) return json({ error: 'Enter valid account details.' }, 400);
      const updated = { ...stored, account: { ...stored.account, position: body.position.trim(), organisation: body.organisation.trim() } };
      const payload = Buffer.from(JSON.stringify(updated)).toString('base64url');
      return json({ account: updated.account, synthetic: true }, 200, `sorp_preview_account=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${request.nextUrl.protocol === 'https:' ? '; Secure' : ''}`);
    }
    if (body.action === 'load-product') return json({ signedIn: true, ...stored, productProgress: null });
    if (body.action === 'team-workspace') return json({ signedIn: true, organisation: null });
    if (body.action === 'platform-workspace') return json({ signedIn: true, ...stored, platformAccess: access, organisations: [] });
    return json({ signedIn: true, ...stored, platformAccess: access, reviews: [], synthetic: true });
  }
  if (path === '/api/onboarding/context') {
    if (!stored) return json({ charity: null }, 401);
    const introduction = stored.progress.onboarding as { facts?: unknown; selected?: unknown } | undefined;
    return json({ account: stored.account, facts: introduction?.facts, charity: introduction?.selected ? { candidate: introduction.selected, status: 'not_started' } : null, documents: [] });
  }
  if (path.startsWith('/api/onboarding')) {
    const action = path.split('/').pop();
    if (action === 'complete') return json({ saved: true, synthetic: true });
    let state = initialConversation();
    try {
      const [payload, signature] = (request.cookies.get('sorp_preview_draft')?.value || '').split('.');
      if (signature === sign(payload)) state = normaliseConversation(JSON.parse(Buffer.from(payload, 'base64url').toString()));
    } catch { /* A missing draft starts an empty synthetic introduction. */ }
    if (action === 'edit') state = applyFacts(state, body.fields || {}, 'form');
    if (action === 'turn') state = advance(state, extractImmediate(String(body.message || body.text || ''), state), body.skip === true);
    if (action === 'search') state = { ...state, charity: { ...state.charity, proposed: 'Synthetic Test Charity', phase: 'confirm', confirmed: null, candidates: [{ locality: '', latestIncome: null, financialYearEnd: '', accountingBasis: '', accountingBasisConfidence: '', summary: 'Synthetic fixture, not an official record', reportUrl: '', reportTitle: '', reportPeriod: '', publicReadiness: { impactReport: { found: false, title: '', url: '' } }, name: 'Synthetic Test Charity', registrationNumber: '0000000', jurisdiction: 'England and Wales', entityType: 'registered_charity', website: 'https://example.invalid', officialUrl: 'https://register-of-charities.charitycommission.gov.uk/', sources: [] }] } };
    if (action === 'confirm') {
      const candidate = state.charity.candidates[body.index];
      if (!candidate) return json({ error: 'Select the synthetic record first.' }, 400);
      state = confirmCharity(state, candidate, false);
    }
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    if (payload.length > 3700) return json({ error: 'Synthetic draft limit reached. Start a fresh Preview session.' }, 413);
    return json({ state, selected: state.charity.confirmed, messages: [], question: nextQuestion(state), notice: 'Isolated routing Preview: these are deterministic test responses, not the live conversational AI.', synthetic: true }, 200, `sorp_preview_draft=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${request.nextUrl.protocol === 'https:' ? '; Secure' : ''}`);
  }
  if (path === '/api/impact-director') return json(stored ? { signedIn: true, account: stored.account, progress: null, revision: 0 } : { signedIn: false }, stored ? 200 : 401);
  if (path === '/api/published-review' && body.operation === 'find') {
    const candidate = { name: 'Synthetic Test Charity', registrationNumber: '0000000', jurisdiction: 'England and Wales', entityType: 'registered_charity', website: 'https://example.invalid', officialUrl: 'https://register-of-charities.charitycommission.gov.uk/', sources: [], publicReadiness: { impactReport: { found: false, url: '', title: '' } } };
    return json({ research: { status: 'found', candidates: [candidate], query: body.query } });
  }
  // Every other API action is blocked before its production route can execute.
  return json({ error: 'This service is disabled in the isolated routing Preview. No production request was made.', synthetic: true }, 503);
}
