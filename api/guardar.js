const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { titulo_noticia, url_noticia, riesgo_general, datos_json } = req.body;

    // Las credenciales se inyectan de forma segura desde Vercel
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    try {
        const { data, error } = await supabase
            .from('informes_sarlaft')
            .insert([{ 
                titulo_noticia, 
                url_noticia, 
                riesgo_general, 
                datos_json 
            }]);

        if (error) throw error;
        
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
