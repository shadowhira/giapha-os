-- ==========================================
-- 🚨 DANGER ZONE: DROP GIAPHA-OS DATABASE SCHEMA 🚨
-- ==========================================
-- WARNING: DO NOT RUN THIS SCRIPT UNLESS YOU KNOW EXACTLY WHAT YOU ARE DOING.
-- This script PERMANENTLY removes all tables, functions, triggers, and types created by schema.sql.
-- All data will be LOST irreversibly.
-- ==========================================

-- 1. DROP TABLES
DROP TABLE IF EXISTS public.gallery_items CASCADE;
DROP TABLE IF EXISTS public.custom_events CASCADE;
DROP TABLE IF EXISTS public.relationships CASCADE;
DROP TABLE IF EXISTS public.persons CASCADE;

-- 2. DROP FUNCTIONS
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- 3. DROP ENUMS
DROP TYPE IF EXISTS public.relationship_type_enum CASCADE;
DROP TYPE IF EXISTS public.gender_enum CASCADE;
