-- Add student-specific fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS grade_level text,
ADD COLUMN IF NOT EXISTS focus_subjects text[] DEFAULT '{}'::text[];

-- Add description column to class_materials if not exists
ALTER TABLE public.class_materials 
ADD COLUMN IF NOT EXISTS description text;