// Módulo de autenticación (Supabase Auth) compartido por toda la app.
window.SarlaftAuth = (function () {
    let supabaseClient = null;
    let cachedSession = null;

    async function initSupabase() {
        if (supabaseClient) return supabaseClient;
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('No se pudo cargar la configuración de Supabase.');
        const { url, anonKey } = await res.json();
        supabaseClient = window.supabase.createClient(url, anonKey);
        return supabaseClient;
    }

    async function getSession() {
        const client = await initSupabase();
        const { data } = await client.auth.getSession();
        cachedSession = data.session;
        return cachedSession;
    }

    // Llamar al inicio de cada página protegida (index.html, etc.).
    // Si no hay sesión válida, redirige a login.html.
    async function requireSession() {
        const session = await getSession();
        if (!session) {
            window.location.href = '/login.html';
            return null;
        }
        pintarUsuario(session.user);
        return session;
    }

    // Llamar al inicio de login.html. Si ya hay sesión, salta directo a la app.
    async function redirectIfLoggedIn() {
        const session = await getSession();
        if (session) window.location.href = '/index.html';
    }

    async function login(email, password) {
        const client = await initSupabase();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.session;
    }

    async function logout() {
        const client = await initSupabase();
        await client.auth.signOut();
        window.location.href = '/login.html';
    }

    function pintarUsuario(user) {
        const el = document.getElementById('usuario-actual');
        if (el && user) el.textContent = user.email;
    }

    // Reemplazo de fetch: adjunta el token de sesión y redirige a login si expiró.
    async function authFetch(url, options = {}) {
        const session = await getSession();
        if (!session) {
            window.location.href = '/login.html';
            throw new Error('Sesión no iniciada.');
        }
        const headers = Object.assign({}, options.headers || {}, {
            Authorization: `Bearer ${session.access_token}`,
        });
        const res = await fetch(url, Object.assign({}, options, { headers }));
        if (res.status === 401) {
            window.location.href = '/login.html';
        }
        return res;
    }

    return { requireSession, redirectIfLoggedIn, login, logout, authFetch, getSession };
})();