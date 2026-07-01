// Autenticación privada ZacBe con Supabase
const ZACBE_SUPABASE_URL = 'https://dwvngngjkhozuekvflnn.supabase.co';
const ZACBE_SUPABASE_KEY = 'sb_publishable_e2mfIOaBhNP12VdsKWDHqQ_5dcy8iBU';
const zacbeSupabase = window.supabase.createClient(ZACBE_SUPABASE_URL, ZACBE_SUPABASE_KEY);

async function requireZacbeSession(){
  const { data } = await zacbeSupabase.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return;
  }
  document.body.classList.remove('auth-loading');
  const btn = document.getElementById('btnLogout');
  if (btn) {
    btn.addEventListener('click', async () => {
      await zacbeSupabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }
}

document.addEventListener('DOMContentLoaded', requireZacbeSession);
