-- ============================================================================
-- EL CORTE PILSEN · PARAGUAY — Esquema Relacional Listo para Supabase (PostgreSQL)
-- Ejecutar este script en el SQL Editor de tu proyecto Supabase.
-- Nota: No incluye votos iniciales ficticios ("si no hay registros, no hay votos").
-- Sí incluye los grupos postulados iniciales y publicaciones del muro moderables
-- desde el Panel Administrador.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  voting_open BOOLEAN NOT NULL DEFAULT TRUE,
  group_submissions_open BOOLEAN NOT NULL DEFAULT TRUE,
  wall_posting_open BOOLEAN NOT NULL DEFAULT TRUE,
  force_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  challenger_target_iso TEXT NOT NULL DEFAULT '2026-12-05T20:00:00-03:00',
  admin_passcode_hash TEXT,
  seeded_groups_applied BOOLEAN NOT NULL DEFAULT FALSE,
  seeded_posts_applied BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parrilleros (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  email TEXT UNIQUE,
  password_hash TEXT,
  phone TEXT,
  ci TEXT,
  city TEXT NOT NULL CHECK (char_length(trim(city)) >= 2),
  favorite_cut TEXT NOT NULL,
  avatar_style TEXT NOT NULL CHECK (avatar_style IN ('brasa', 'chop', 'estaca', 'cuchillo')),
  rank TEXT NOT NULL DEFAULT 'Aprendiz de Fuego',
  member_number TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'voter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migraciones seguras para tablas existentes
ALTER TABLE public.parrilleros ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.parrilleros ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.parrilleros ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.parrilleros ADD COLUMN IF NOT EXISTS ci TEXT;
ALTER TABLE public.parrilleros ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'voter';

-- Super Administrador Ariel Ojeda (PY-00001)
INSERT INTO public.parrilleros (
  id, name, email, password_hash, city, favorite_cut, avatar_style, rank, member_number, role
) VALUES (
  'parrillero-superadmin',
  'Ariel Ojeda',
  'ariel.ojeda@lupe.com.py',
  'c04229b47e24a480430030da6e07e868$07b1981cb6f3ee824c9c10427b3fafe3968600d805bf744bfa2863df39df0ae60ecda1d2f703e390c50b64be8120b604596b610c1f516847c234a652a9221ae0',
  'Asunción, Paraguay',
  'costilla',
  'brasa',
  'Maestro Parrillero Pilsen',
  'PY-00001',
  'superadmin'
) ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  email = 'ariel.ojeda@lupe.com.py',
  member_number = 'PY-00001';

CREATE TABLE IF NOT EXISTS public.tournament_votes (
  id TEXT PRIMARY KEY,
  parrillero_id TEXT NOT NULL REFERENCES public.parrilleros(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL CHECK (
    day_key IN ('day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7Tradicional', 'day7Boss')
  ),
  cut_id TEXT NOT NULL CHECK (
    cut_id IN (
      'costilla', 'tira_fina', 'vacio', 'entrana',
      'colita', 'bife_chorizo', 'tapa', 'ojo_bife', 'retador'
    )
  ),
  boss_choice TEXT CHECK (boss_choice IS NULL OR boss_choice IN ('retador', 'challenger')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parrillero_id, day_key)
);

CREATE TABLE IF NOT EXISTS public.friend_groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 3),
  zone TEXT NOT NULL CHECK (zone IN ('Asunción', 'Gran Asunción', 'Ciudad del Este', 'Interior')),
  neighborhood TEXT NOT NULL,
  captain_name TEXT NOT NULL,
  members JSONB NOT NULL CHECK (
    jsonb_typeof(members) = 'array'
    AND jsonb_array_length(members) BETWEEN 2 AND 10
  ),
  favorite_cut TEXT NOT NULL,
  motto TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  created_at_ms BIGINT NOT NULL,
  owner_visitor_id TEXT,
  is_seeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.friend_group_likes (
  group_id TEXT NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS public.experience_posts (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_city TEXT NOT NULL,
  author_rank TEXT NOT NULL,
  cooking_point TEXT NOT NULL CHECK (
    cooking_point IN ('Jugoso', 'A Punto', 'Bien Cocido', 'Vuelta y Vuelta')
  ),
  caption TEXT NOT NULL CHECK (char_length(trim(caption)) >= 8),
  image TEXT NOT NULL,
  fires INTEGER NOT NULL DEFAULT 0 CHECK (fires >= 0),
  timestamp_label TEXT NOT NULL DEFAULT 'Recién ahora',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_fires (
  post_id TEXT NOT NULL REFERENCES public.experience_posts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES public.experience_posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(trim(text)) >= 1),
  cooking_point TEXT,
  timestamp_label TEXT NOT NULL DEFAULT 'Ahora',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda y agregaciones rápidas
CREATE INDEX IF NOT EXISTS idx_tournament_votes_cut ON public.tournament_votes (cut_id);
CREATE INDEX IF NOT EXISTS idx_friend_groups_likes ON public.friend_groups (likes DESC);
CREATE INDEX IF NOT EXISTS idx_friend_groups_zone ON public.friend_groups (zone);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments (post_id);

-- Row Level Security (RLS): lectura pública de tablero y postulaciones; mutaciones vía Backend/Service Role
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parrilleros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_fires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read friend_groups" ON public.friend_groups;
CREATE POLICY "Public read friend_groups" ON public.friend_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read experience_posts" ON public.experience_posts;
CREATE POLICY "Public read experience_posts" ON public.experience_posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read post_comments" ON public.post_comments;
CREATE POLICY "Public read post_comments" ON public.post_comments
  FOR SELECT USING (true);

-- Configuración inicial (sin votos falsos)
INSERT INTO public.app_settings (
  id, voting_open, group_submissions_open, wall_posting_open, force_revealed, seeded_groups_applied, seeded_posts_applied
)
VALUES ('default', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Postulaciones iniciales visibles para el cliente (eliminables permanentemente por el Administrador)
INSERT INTO public.friend_groups (id, code, name, zone, neighborhood, captain_name, members, favorite_cut, motto, likes, created_at_ms, is_seeded)
VALUES
  ('grp-1', '#GRP-0101', 'Los Quebracho del Tercer Tiempo', 'Asunción', 'Villa Morra', 'Matías Vera', '["Matías Vera","Santi Ferreira","Lucas Benítez","Nico Ayala","Tito Paredes","Gabi Rojas","Fede Ortiz","Mauri Silva","Ale Cañete","Juanma López"]'::jsonb, 'Tapa Cuadril', 'Diez perros de toda la vida listos para sentar cátedra en la mesa de la Gran Final y elegir el corte campeón.', 1420, 1732200000000, TRUE),
  ('grp-2', '#GRP-0102', 'La Banda de la Estaca Luqueña', 'Gran Asunción', 'Centro · Luque', 'Camila Duarte', '["Camila Duarte","Marisol Galeano","Julio Amarilla","Beto Cardozo","César Giménez","Sofi Núñez","Rolo Medina","Damián Torres"]'::jsonb, 'Costilla Tira Ancha', 'Desde los quinchos de Luque con fuego lento, mandioca tibia y criterio parrillero de verdad.', 1285, 1732250000000, TRUE),
  ('grp-3', '#GRP-0103', 'Frontera Brasa Club CDE', 'Ciudad del Este', 'Área 1', 'Derlis Villalba', '["Derlis Villalba","Fernando Acosta","Hugo Ramírez","Pato Villamayor","Óscar Fretes","Lucho Chávez","Enzo Bogado","Iván Barrios","Sebas Fleitas"]'::jsonb, 'Vacío', 'Representando al Alto Paraná: sabemos distinguir al instante la membrana crocante del nuevo corte en rombo.', 1140, 1732300000000, TRUE),
  ('grp-4', '#GRP-0104', 'Sajonia Carbón & Chopin', 'Asunción', 'Sajonia', 'Rodrigo Benítez', '["Rodrigo Benítez","Pablito Sosa","Kike Valiente","Majo Franco","Tomi Coronel","Ema Báez","Chino Cáceres"]'::jsonb, 'Colita de Cuadril', 'Después de cada partido en el Defensores prendemos la parrilla. Queremos votar en vivo en la Gran Final.', 980, 1732340000000, TRUE),
  ('grp-5', '#GRP-0105', 'Encarnacenos del Quinto Tiempo', 'Interior', 'Costanera · Encarnación', 'Arnaldo Caballero', '["Arnaldo Caballero","Valeria Reckziegel","Marcos Aquino","Diego Rolón","Nati Méndez","Fabián Escobar"]'::jsonb, 'Ojo de Bife', 'Viajamos desde Itapúa con la conservadora cargada para juzgar el corte campeón con los perros.', 864, 1732360000000, TRUE),
  ('grp-6', '#GRP-0106', 'Parrilleros de Sanlo Centro', 'Gran Asunción', 'San Lorenzo', 'Gustavo Insfrán', '["Gustavo Insfrán","Leticia Zaracho","Kevin Villalba","Bruno Sanabria","Mili Acosta","Piero Melgarejo","José Ocampos","Axel Prieto"]'::jsonb, 'Bife de Chorizo', 'Ocho amigos que todos los viernes prueban un corte distinto con Pilsen bien helada.', 742, 1732380000000, TRUE),
  ('grp-7', '#GRP-0107', 'Las Mercedes Fuego Vivo', 'Asunción', 'Las Mercedes', 'Belén Segovia', '["Belén Segovia","Andrea Espínola","Joaquín Vera","Santi Mendieta","Claudio Galeano"]'::jsonb, 'Entraña Fina', 'Equipo chico pero infalible en el punto de cocción: vuelta y vuelta y directo a la tabla.', 615, 1732400000000, TRUE),
  ('grp-8', '#GRP-0108', 'Chaco Boreal a la Estaca', 'Interior', 'Filadelfia · Boquerón', 'Tobías Friesen', '["Tobías Friesen","Hans Wiebe","Mateo Benítez","Carlos Riquelme","Víctor Peralta","Elías Mendoza","Javi Díaz","Néstor Servín","Rubén Ávalos","Dani Romero"]'::jsonb, 'Costilla Tira Ancha', 'Diez chaqueños expertos en asado a la estaca listos para probar el nuevo corte en rombo.', 530, 1732420000000, TRUE),
  ('grp-9', '#GRP-0109', 'Quincho Lambaré 24/7', 'Gran Asunción', 'Lambaré', 'Renato Lezcano', '["Renato Lezcano","Fabiola Ruiz","Cristhian Lugo","Omar Talavera","Pedro Martínez","Lourdes Vera"]'::jsonb, 'Tapa Cuadril', 'Nunca se apaga el fuego en Lambaré. Queremos ser el grupo que decida la Gran Final.', 398, 1732440000000, TRUE),
  ('grp-10', '#GRP-0110', 'Villarrica Brasas del Guairá', 'Interior', 'Centro · Villarrica', 'Esteban Oviedo', '["Esteban Oviedo","Lorena Bogado","Raúl Montiel","Gero Samaniego"]'::jsonb, 'Vacío', 'Desde el Guairá traemos el mejor apetito y criterio parrillero para la mesa final.', 215, 1732460000000, TRUE)
ON CONFLICT (id) DO NOTHING;
