-- سياسات RLS لرفع الصور في Storage (bucket: uploads)
-- نفّذ هذا الملف في Supabase SQL Editor
-- تأكد أن bucket "uploads" موجود في Storage (إنشئه من لوحة Supabase إن لم يكن)

-- حذف السياسات القديمة إن وُجدت (لتجنب التكرار)
DROP POLICY IF EXISTS "Allow authenticated uploads to admin folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read uploads" ON storage.objects;

-- السماح للمسجلين برفع ملفات في uploads
CREATE POLICY "Allow authenticated uploads to admin folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- السماح للجميع بقراءة الملفات (المجلد public)
CREATE POLICY "Allow public read uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- السماح للمسجلين بتحديث/حذف ملفاتهم
CREATE POLICY "Allow authenticated update uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

CREATE POLICY "Allow authenticated delete uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
