-- Create tutor_sessions table for chat persistence
CREATE TABLE public.tutor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES public.analysis_history(id) ON DELETE SET NULL,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view their own tutor sessions"
ON public.tutor_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tutor sessions"
ON public.tutor_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutor sessions"
ON public.tutor_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tutor sessions"
ON public.tutor_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_tutor_sessions_updated_at
BEFORE UPDATE ON public.tutor_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();