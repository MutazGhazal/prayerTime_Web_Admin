-- سياسات RLS لجدول الإعلانات الموحد app_ads
-- نفّذ هذا الملف في Supabase SQL Editor

-- 1. تفعيل RLS
ALTER TABLE public.app_ads ENABLE ROW LEVEL SECURITY;

-- 2. سياسة القراءة: الجميع يمكنه رؤية الإعلانات النشطة، وصاحب الإعلان يمكنه رؤية إعلانه دائماً
DROP POLICY IF EXISTS "Public read ads" ON public.app_ads;
CREATE POLICY "Public read ads" ON public.app_ads
FOR SELECT USING (is_active = true OR auth.uid() = owner_id);

-- 3. سياسة الأدمن: الأدمن (الموجود في جدول admin_users) يمكنه فعل كل شيء
DROP POLICY IF EXISTS "Admins manage all ads" ON public.app_ads;
CREATE POLICY "Admins manage all ads" ON public.app_ads
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- 4. سياسة الإضافة: المستخدم أو المشرف يمكنه إضافة إعلاناته الخاصة فقط
DROP POLICY IF EXISTS "Users insert own ads" ON public.app_ads;
CREATE POLICY "Users insert own ads" ON public.app_ads
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- 5. سياسة التعديل: المستخدم أو المشرف يمكنه تعديل إعلاناته الخاصة
DROP POLICY IF EXISTS "Users update own ads" ON public.app_ads;
CREATE POLICY "Users update own ads" ON public.app_ads
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 6. سياسة الحذف: المستخدم أو المشرف يمكنه حذف إعلاناته الخاصة
DROP POLICY IF EXISTS "Users delete own ads" ON public.app_ads;
CREATE POLICY "Users delete own ads" ON public.app_ads
FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- ملاحظة: إذا كنت تواجه مشكلة في الرفع، تأكد أن المستخدم مسجل دخول (Authenticated)
-- وأن قيمة owner_id في البيانات المرسلة تطابق المعرف الفريد للمستخدم (UID)
