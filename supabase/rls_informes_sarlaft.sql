-- Ejecutar en Supabase: Dashboard > SQL Editor.
-- Habilita Row Level Security y registra quién crea cada informe.

alter table informes_sarlaft
    add column if not exists creado_por uuid references auth.users(id);

alter table informes_sarlaft enable row level security;

-- Con RLS activo, por defecto NADIE puede leer/escribir salvo que exista una
-- política explícita. api/guardar.js usa la Service Role Key (que se salta RLS
-- a propósito), así que estas políticas son para si en el futuro el frontend
-- consulta Supabase directamente con la anon/publishable key.

drop policy if exists "usuarios_autenticados_pueden_leer" on informes_sarlaft;
create policy "usuarios_autenticados_pueden_leer"
    on informes_sarlaft for select
    to authenticated
    using (true);

drop policy if exists "usuarios_autenticados_pueden_insertar" on informes_sarlaft;
create policy "usuarios_autenticados_pueden_insertar"
    on informes_sarlaft for insert
    to authenticated
    with check (true);

-- Nadie puede actualizar ni borrar directamente desde el cliente:
-- solo procesos de servidor con Service Role Key.