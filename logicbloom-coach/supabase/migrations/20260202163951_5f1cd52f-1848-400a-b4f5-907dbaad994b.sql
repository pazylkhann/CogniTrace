-- Create role enum
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

-- Create user_roles table (secure role storage)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add class_code to classrooms
ALTER TABLE public.classrooms ADD COLUMN class_code TEXT UNIQUE;

-- Function to generate unique class code
CREATE OR REPLACE FUNCTION public.generate_class_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  -- Generate format: XXX-XXX (6 chars with dash)
  FOR i IN 1..3 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..3 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-generate class code on classroom creation
CREATE OR REPLACE FUNCTION public.set_class_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.class_code IS NULL THEN
    LOOP
      NEW.class_code := public.generate_class_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classrooms WHERE class_code = NEW.class_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_class_code
BEFORE INSERT ON public.classrooms
FOR EACH ROW
EXECUTE FUNCTION public.set_class_code();

-- Create class_members table (links students to classrooms)
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Class members policies
CREATE POLICY "Teachers can view their class members"
ON public.class_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE id = classroom_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own memberships"
ON public.class_members
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Students can join classes"
ON public.class_members
FOR INSERT
WITH CHECK (student_id = auth.uid() AND public.has_role(auth.uid(), 'student'));

CREATE POLICY "Students can leave classes"
ON public.class_members
FOR DELETE
USING (student_id = auth.uid());

-- Create class_materials table
CREATE TABLE public.class_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;

-- Materials policies
CREATE POLICY "Teachers can manage their class materials"
ON public.class_materials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE id = classroom_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Students can view materials of joined classes"
ON public.class_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.class_members 
    WHERE classroom_id = class_materials.classroom_id AND student_id = auth.uid()
  )
);

-- Create storage bucket for class materials
INSERT INTO storage.buckets (id, name, public) VALUES ('class-materials', 'class-materials', false);

-- Storage policies for class materials
CREATE POLICY "Teachers can upload materials"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'class-materials' 
  AND public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Teachers can view their materials"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'class-materials' 
  AND public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Students can view materials from joined classes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'class-materials'
  AND public.has_role(auth.uid(), 'student')
);