
const { getSupabaseAdmin } = require('./_auth');
const C = require('../public/js/capturador-listas.js');
const T = 'capturador_registros';

module.exports = async (req, res) => {
    const clave = process.env.CLAVE_EXPORTA;
    if (!clave || (req.headers['x-clave'] || '') !== clave) {
        return res.status(401).json({ error: 'Clave inválida.' });
    }
    try {
        const sb = getSupabaseAdmin();

        // GET: filas pendientes en TSV (39 columnas de la tabla BASE)
        if (req.method === 'GET') {
            const { data, error } = await sb.from(T)
                .select('id,datos').eq('exportado', false).order('id', { ascending: true });
            if (error) throw error;
            const lineas = ['IDS\t' + data.map(r => r.id).join(','), C.cols.join('\t')];
            data.forEach(r => {
                lineas.push(C.fila(r.datos).map(v => (v === null || v === undefined) ? '' : String(v)).join('\t'));
            });
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(200).send(lineas.join('\n'));
        }

        // POST: marcar ids como exportados
        if (req.method === 'POST') {
            const ids = String((req.body || {}).ids || '').split(',').map(Number).filter(Boolean);
            if (!ids.length) return res.status(400).json({ error: 'Faltan ids.' });
            const { error } = await sb.from(T).update({ exportado: true }).in('id', ids);
            if (error) throw error;
            return res.status(200).json({ ok: true, marcados: ids.length });
        }

        return res.status(405).json({ error: 'Método no permitido.' });
    } catch (e) {
        return res.status(500).json({ error: 'Error del servidor: ' + e.message });
    }
};