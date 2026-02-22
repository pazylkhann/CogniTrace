-- Make the student-work bucket private to prevent unauthorized access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'student-work';