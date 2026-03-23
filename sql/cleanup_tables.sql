-- 1. مسح جدول إعلانات الأدمن القديم (تم استبداله بـ app_ads)
DROP TABLE IF EXISTS admin_sections CASCADE;

-- 2. مسح جدول إعلانات المستخدمين القديم (تم استبداله بـ app_ads)
DROP TABLE IF EXISTS app_user_sections CASCADE;

-- ملاحظة: إذا كان جدول "admins" قديماً وغير مستخدم (لأنك تستخدم "admin_users" حالياً للوحة التحكم)، يمكنك إزالة الـ (--) من السطر القادم لمسحه أيضاً:
-- DROP TABLE IF EXISTS admins CASCADE;
