// Estas dos llaves están diseñadas por Supabase para ser públicas: van protegidas
// por Row Level Security, no por secreto. Nunca exponer aquí la SERVICE_ROLE_KEY
// ni la SECRET_KEY.
module.exports = async (req, res) => {
    const url = process.env.SUPABASE_URL || '';
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!url || !anonKey) {
        return res.status(500).json({ error: 'Configuración de Supabase incompleta en el servidor.' });
    }

    return res.status(200).json({ url, anonKey });
};