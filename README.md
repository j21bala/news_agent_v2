# Plataforma de Inteligencia SARLAFT (news_agent_v2)

Módulos: **Análisis de Noticias**, **Cruce Masivo** (ambos con historial por analista) y **Casos de Investigación**
(mapa de vínculos, sujetos, transacciones, cronología, informe tipo ROS, evidencias con SHA-256 y auditoría inmutable).

## Puesta en marcha
1. Supabase → SQL Editor: ejecutar `supabase/casos_y_historial.sql` (tablas, RLS por analista, bucket privado `evidencias`).
2. Variables en Vercel: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `TAVILY_API_KEY`, `GEMINI_API_KEY`.
3. Crear usuarios (analistas) en Supabase Auth. Cada uno solo ve sus casos, historial y evidencias.
