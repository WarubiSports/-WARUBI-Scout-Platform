type RuntimeEnvironment = { get(name: string): string | undefined };
type AccessResult = { allowed: true } | { allowed: false; status: number; error: string };

// The Auth server verifies the token. Identity and approval never come from the
// request body, an unverified JWT, an editable scout profile, or browser limits.
export async function authorizeAIRequest(
  request: Request,
  env: RuntimeEnvironment,
  fetcher: typeof fetch = fetch,
): Promise<AccessResult> {
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return { allowed: false, status: 401, error: 'Authentication required' };

  const url = env.get('SUPABASE_URL');
  const key = env.get('SUPABASE_PUBLISHABLE_KEY') || env.get('SUPABASE_ANON_KEY');
  if (!url || !key) return { allowed: false, status: 503, error: 'Authorization unavailable' };
  const headers = { apikey: key, Authorization: `Bearer ${token}` };
  // One budget covers all approval reads. No service-role credential is needed.
  const signal = AbortSignal.timeout(5_000);
  try {
    const userResponse = await fetcher(`${url}/auth/v1/user`, { headers, signal });
    if ([400, 401, 403, 422].includes(userResponse.status)) {
      return { allowed: false, status: 401, error: 'Authentication required' };
    }
    if (!userResponse.ok) return { allowed: false, status: 503, error: 'Authorization unavailable' };
    const user = await userResponse.json();
    if (!user || typeof user.id !== 'string' || !user.id || user.is_anonymous === true
      || typeof user.email !== 'string' || !user.email_confirmed_at) {
      return { allowed: false, status: 401, error: 'Verified account required' };
    }
    if (user.app_metadata?.role === 'admin') return { allowed: true };

    const email = user.email.trim().toLowerCase();
    const staffQuery = new URLSearchParams({ select: 'id', email: `eq.${email}`, limit: '1' });
    const staffResponse = await fetcher(`${url}/rest/v1/approved_staff?${staffQuery}`, { headers, signal });
    if (!staffResponse.ok) return { allowed: false, status: 503, error: 'Authorization unavailable' };
    const staff = await staffResponse.json();
    if (!Array.isArray(staff)) return { allowed: false, status: 503, error: 'Authorization unavailable' };
    if (staff.some((entry) => typeof entry?.id === 'string' && entry.id)) return { allowed: true };

    // This existing SECURITY DEFINER RPC reads the administrator-controlled
    // approved_scouts table. The verified email is its only argument.
    const scoutResponse = await fetcher(`${url}/rest/v1/rpc/check_email_approved`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_to_check: email }), signal,
    });
    if (!scoutResponse.ok) return { allowed: false, status: 503, error: 'Authorization unavailable' };
    const scouts = await scoutResponse.json();
    if (!Array.isArray(scouts)) return { allowed: false, status: 503, error: 'Authorization unavailable' };
    if (scouts.some((entry) => entry?.is_approved === true)) return { allowed: true };
    return { allowed: false, status: 403, error: 'Approved staff or scout access required' };
  } catch {
    // Do not expose tokens, email addresses, provider responses, or exceptions.
    return { allowed: false, status: 503, error: 'Authorization unavailable' };
  }
}
