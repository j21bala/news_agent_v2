const { createClient } = require('@supabase/supabase-js');

// Cliente con la Service Role Key: SOLO se usa en el servidor (funciones /api),
// nunca se expone al navegador. Permite verificar sesiones y escribir en BD
// aunque haya Row Level Security activo.
function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!url || !serviceKey) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY en las variables de entorno de Vercel.');
    }
    return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Verifica el token Bearer enviado por el frontend contra Supabase Auth.
// Devuelve { usuario } si es válido, o { error } si no lo es.
async function verificarSesion(req) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return { error: 'No autenticado: falta el token de sesión.' };
    }

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !data?.user) {
            return { error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' };
        }
        return { usuario: data.user };
    } catch (e) {
        return { error: 'No se pudo verificar la sesión: ' + e.message };
    }
}

// Envoltorio para proteger un handler de /api/*.js con una sola línea.
function protegerRuta(handler) {
    return async (req, res) => {
        const { usuario, error } = await verificarSesion(req);
        if (error) {
            return res.status(401).json({ error });
        }
        req.usuario = usuario;
        return handler(req, res);
    };
}

module.exports = { getSupabaseAdmin, verificarSesion, protegerRuta };