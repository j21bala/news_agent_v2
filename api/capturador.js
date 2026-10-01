const { getSupabaseAdmin, protegerRuta } = require('./_auth');
const C = require('../public/js/capturador-listas.js');
const T = 'capturador_registros';

module.exports = protegerRuta(async (req, res) => {
    try {
        const sb = getSupabaseAdmin();
        if (req.method === 'GET') {
            let q = sb.from(T).select('id,creado_en,creado_por_email,anio,num_ris,datos,exportado').order('id', { ascending: false }).limit(1000);
            if (req.query.pendientes) q = q.eq('exportado', false);
            const { data, error } = await q;
            if (error) throw error;
            return res.status(200).json({ data });
        }
        if (req.method === 'POST') {
            const { datos, forzar } = req.body || {};
            const errs = C.validar(datos || {});
            if (errs.length) return res.status(400).json({ error: errs.join(' | ') });
            const d = C.derivar(datos);
            if (!forzar) {
                const { data: dup } = await sb.from(T).select('id').eq('anio', Number(d.anio)).eq('num_ris', d.ris).limit(1);
                if (dup && dup.length) return res.status(409).json({ error: `Ya existe un registro con # RIS ${d.ris} del año ${d.anio}.` });
            }
            const { error } = await sb.from(T).insert([{ creado_por: req.usuario.id, creado_por_email: req.usuario.email, anio: Number(d.anio), num_ris: d.ris, datos: d }]);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
        if (req.method === 'PATCH') {
            const ids = ((req.body || {}).ids || []).map(Number).filter(Number.isFinite);
            if (!ids.length) return res.status(400).json({ error: 'Sin ids.' });
            const { error } = await sb.from(T).update({ exportado: true }).in('id', ids);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }
        return res.status(405).json({ error: 'Método no permitido' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});