const authRoots = document.querySelectorAll("[data-site-auth]");
const authConfig = window.DEBATE_SUPABASE_CONFIG || {};
const authConfigured =
  Boolean(authConfig.url) &&
  Boolean(authConfig.anonKey) &&
  !authConfig.url.includes("YOUR_") &&
  !authConfig.anonKey.includes("YOUR_");

function siteAuthRedirectTo() {
  return `${window.location.origin}${window.location.pathname}`;
}

function renderSiteAuth(root) {
  root.innerHTML = `
    <span data-site-auth-label>正在確認登入狀態...</span>
    <button type="button" data-site-login>Google 登入</button>
    <button type="button" data-site-logout hidden>登出</button>
  `;
}

async function initSiteAuth(root, supabase) {
  const label = root.querySelector("[data-site-auth-label]");
  const loginButton = root.querySelector("[data-site-login]");
  const logoutButton = root.querySelector("[data-site-logout]");
  let session = null;

  async function displayName() {
    if (!session) return "";
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .maybeSingle();
    return data?.display_name || session.user.user_metadata?.full_name || session.user.email || "已登入使用者";
  }

  async function updateUi() {
    const isSignedIn = Boolean(session);
    loginButton.hidden = isSignedIn;
    logoutButton.hidden = !isSignedIn;
    label.textContent = isSignedIn ? `目前登入：${await displayName()}` : "尚未登入";
  }

  loginButton.addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: siteAuthRedirectTo()
      }
    });
  });

  logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  const { data } = await supabase.auth.getSession();
  session = data.session;
  await updateUi();

  supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    session = nextSession;
    await updateUi();
  });
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

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(authConfig.url, authConfig.anonKey);

  authRoots.forEach((root) => {
    initSiteAuth(root, supabase).catch(() => {
      root.innerHTML = `<span>登入狀態暫時無法載入</span>`;
    });
  });
}

main();
