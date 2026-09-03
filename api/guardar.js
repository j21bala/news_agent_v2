const { getSupabaseAdmin, protegerRuta } = require('./_auth');

module.exports = protegerRuta(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { titulo_noticia, url_noticia, riesgo_general, datos_json } = req.body;

    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('informes_sarlaft')
            .insert([{
                titulo_noticia,
                url_noticia,
                riesgo_general,
                datos_json,
                creado_por: req.usuario?.id || null,
            }]);

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});