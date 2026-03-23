-- 1. إضافة عمود section لجدول app_ads (إذا لم يكن موجوداً)
ALTER TABLE app_ads ADD COLUMN IF NOT EXISTS section INT;

-- 2. نسخ بيانات الإعلانات من admin_sections
-- الأدمن والروابط الخاصة بالتسويق ستأخذ نوع 'admin'
INSERT INTO app_ads (
    type,
    section,
    title,
    body,
    image_url,
    link_url,
    sort_order,
    is_active
)
SELECT 
    'admin' AS type,
    section,
    title,
    body,
    image_url,
    link_url,
    sort_order,
    is_active
FROM admin_sections;

-- 3. نسخ بيانات المشرفين من supervisor_ads (إن وجد)
-- INSERT INTO app_ads (type, owner_id, title, body, image_url, link_url, sort_order, is_active)
-- SELECT 'supervisor', supervisor_id, title, body, image_url, link_url, sort_order, is_active FROM supervisor_ads;

-- 4. نسخ بيانات المستخدمين من app_user_sections
-- يعتبر أول عنصر (sort_order = 0) بمثابة البروفايل 'profile' والباقي 'user'
INSERT INTO app_ads (
    type,
    owner_id,
    section,
    title,
    body,
    image_url,
    link_url,
    sort_order,
    is_active
)
SELECT 
    CASE WHEN sort_order = 0 THEN 'profile' ELSE 'user' END AS type,
    user_id AS owner_id,
    1 AS section,
    title,
    body,
    image_url,
    link_url,
    sort_order,
    true AS is_active
FROM app_user_sections;

-- انتهى النقل بنجاح
