# LUXORA Cloud — إعداد سريع

تم ربط المتجر بقاعدة Supabase الخاصة بمشروع LUXORA.

## 1) قاعدة البيانات
افتح Supabase → SQL Editor وشغّل `supabase_setup.sql` مرة واحدة.

## 2) حساب المدير
من Supabase → Authentication → Users أنشئ مستخدمًا ببريدك وكلمة مرور قوية.
استخدم هذا الحساب عند تسجيل الدخول إلى لوحة التحكم (نسخة المتصفح الحالية تعتمد على جلسة Supabase).

## 3) المفاتيح
`supabase-config.js` يحتوي فقط على Project URL وPublishable key. لا تضع Secret key في الموقع.

## 4) التشغيل
افتح `index.html` للمتجر و`admin.html` للوحة التحكم.

> ملاحظة: إذا فتحت الملفات مباشرة من `file://` ومنع المتصفح طلبات الشبكة، استخدم استضافة ثابتة مثل GitHub Pages/Netlify أو خادم محلي بسيط.
