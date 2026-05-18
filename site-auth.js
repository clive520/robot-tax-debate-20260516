const authRoots = document.querySelectorAll("[data-site-auth]");
const authConfig = window.DEBATE_SUPABASE_CONFIG || {};
const authStorageKey = "ai_debate_supabase_session";
const authConfigured = Boolean(authConfig.url) && Boolean(authConfig.anonKey);

function authRedirectTo() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function oauthUrl() {
  const url = new URL(`${authConfig.url}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", authRedirectTo());
  return url.toString();
}

function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(authStorageKey) || "null");
    if (!session?.access_token) return null;
    if (session.expires_at && Number(session.expires_at) * 1000 <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function storeSessionFromHash() {
  if (!window.location.hash.includes("access_token")) return readStoredSession();
  const tokenIndex = window.location.hash.indexOf("access_token=");
  const hash = tokenIndex > -1 ? window.location.hash.slice(tokenIndex) : window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const session = {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    expires_at: params.get("expires_at"),
    token_type: params.get("token_type") || "bearer",
  };
  if (session.access_token) {
    localStorage.setItem(authStorageKey, JSON.stringify(session));
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    return session;
  }
  return readStoredSession();
}

async function rest(path, session) {
  const headers = {
    apikey: authConfig.anonKey,
    Authorization: `Bearer ${session?.access_token || authConfig.anonKey}`,
  };
  const response = await fetch(`${authConfig.url}${path}`, { headers });
  if (!response.ok) throw new Error(`Auth REST error ${response.status}`);
  return response.json();
}

async function loadUser(session) {
  if (!session?.access_token) return null;
  return rest("/auth/v1/user", session);
}

async function loadProfile(user, session) {
  if (!user?.id) return null;
  const profiles = await rest(`/rest/v1/profiles?select=display_name,is_admin&id=eq.${encodeURIComponent(user.id)}`, session);
  return profiles?.[0] || null;
}

function renderSiteAuth(root) {
  root.innerHTML = `
    <span data-site-auth-label>正在確認登入狀態...</span>
    <button type="button" data-site-login>Google 登入</button>
    <button type="button" data-site-admin hidden>管理</button>
    <button type="button" data-site-logout hidden>登出</button>
  `;
}

function setSignedOut(root) {
  root.querySelector("[data-site-auth-label]").textContent = "尚未登入";
  root.querySelector("[data-site-login]").hidden = false;
  root.querySelector("[data-site-admin]").hidden = true;
  root.querySelector("[data-site-logout]").hidden = true;
}

function setSignedIn(root, user, profile) {
  const name =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "已登入使用者";
  root.querySelector("[data-site-auth-label]").textContent = `目前登入：${name}${profile?.is_admin ? "（管理員）" : ""}`;
  root.querySelector("[data-site-login]").hidden = true;
  root.querySelector("[data-site-admin]").hidden = !profile?.is_admin;
  root.querySelector("[data-site-logout]").hidden = false;
}

async function initSiteAuth(root, session) {
  const loginButton = root.querySelector("[data-site-login]");
  const adminButton = root.querySelector("[data-site-admin]");
  const logoutButton = root.querySelector("[data-site-logout]");

  loginButton.addEventListener("click", () => {
    window.location.href = oauthUrl();
  });
  adminButton.addEventListener("click", () => {
    window.location.href = `${window.location.origin}/robot-tax-debate-20260516/admin/`;
  });
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(authStorageKey);
    setSignedOut(root);
  });

  if (!session) {
    setSignedOut(root);
    return;
  }

  try {
    const user = await loadUser(session);
    const profile = await loadProfile(user, session);
    setSignedIn(root, user, profile);
  } catch {
    localStorage.removeItem(authStorageKey);
    setSignedOut(root);
  }
}

async function main() {
  if (!authRoots.length) return;
  authRoots.forEach(renderSiteAuth);

  if (!authConfigured) {
    authRoots.forEach((root) => {
      root.querySelector("[data-site-auth-label]").textContent = "登入功能尚未啟用";
      root.querySelector("[data-site-login]").disabled = true;
    });
    return;
  }

  const session = storeSessionFromHash();
  authRoots.forEach((root) => initSiteAuth(root, session));
}

main();
