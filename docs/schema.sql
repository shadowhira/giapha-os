-- ==========================================
-- GIAPHA-OS DATABASE SCHEMA (Neon Postgres)
-- ==========================================
-- Không dùng RLS/roles: mọi người dùng đã đăng nhập Google đều có
-- quyền đọc/ghi như nhau. Việc yêu cầu đăng nhập được kiểm tra ở tầng
-- ứng dụng (Auth.js), không phải ở tầng database.

-- ENUMS
DO $$ BEGIN
    CREATE TYPE public.gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.relationship_type_enum AS ENUM ('marriage', 'biological_child', 'adopted_child');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- UTILITY FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TABLES (Data Preservation: No DROP TABLE commands)
-- ==========================================

-- PERSONS (Core entity for family tree)
-- Gồm cả thông tin trước đây tách riêng ở person_details_private, vì
-- không còn phân quyền admin-only nữa.
CREATE TABLE IF NOT EXISTS public.persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender public.gender_enum NOT NULL,

  -- Date components (allows for partial dates where only year is known)
  birth_year INT,
  birth_month INT,
  birth_day INT,
  death_year INT,
  death_month INT,
  death_day INT,
  death_lunar_year INT,
  death_lunar_month INT,
  death_lunar_day INT,

  is_deceased BOOLEAN NOT NULL DEFAULT FALSE,
  is_in_law BOOLEAN NOT NULL DEFAULT FALSE,
  birth_order INT,
  generation INT,
  other_names TEXT,
  avatar_url TEXT,
  note TEXT,

  -- Thông tin riêng tư (trước đây ở bảng person_details_private)
  phone_number TEXT,
  occupation TEXT,
  current_residence TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONSHIPS (Links between persons)
CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.relationship_type_enum NOT NULL,
  person_a UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  person_b UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_relationship CHECK (person_a != person_b),
  UNIQUE(person_a, person_b, type)
);

-- CUSTOM_EVENTS (User-created events)
-- created_by lưu email Google của người tạo (chỉ để định danh, không phân quyền).
CREATE TABLE IF NOT EXISTS public.custom_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  created_by TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GALLERY_ITEMS
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  event_date DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_relationships_person_a ON public.relationships(person_a);
CREATE INDEX IF NOT EXISTS idx_relationships_person_b ON public.relationships(person_b);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON public.relationships(type);

CREATE INDEX IF NOT EXISTS idx_persons_full_name ON public.persons(full_name);
CREATE INDEX IF NOT EXISTS idx_persons_generation ON public.persons(generation);
CREATE INDEX IF NOT EXISTS idx_persons_gender ON public.persons(gender);
CREATE INDEX IF NOT EXISTS idx_persons_is_deceased ON public.persons(is_deceased);
CREATE INDEX IF NOT EXISTS idx_persons_birth_year ON public.persons(birth_year);

CREATE INDEX IF NOT EXISTS idx_custom_events_date ON public.custom_events(event_date);

-- ==========================================
-- TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS tr_persons_updated_at ON public.persons;
CREATE TRIGGER tr_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_relationships_updated_at ON public.relationships;
CREATE TRIGGER tr_relationships_updated_at BEFORE UPDATE ON public.relationships FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_custom_events_updated_at ON public.custom_events;
CREATE TRIGGER tr_custom_events_updated_at BEFORE UPDATE ON public.custom_events FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
