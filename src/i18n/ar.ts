import type { Dict } from './fr';

// Arabe : affiché de droite à gauche (RTL). Textes à faire relire par un locuteur avant la mise en production.
export const ar: Dict = {
  common: { tokens: 'رموز', token: 'رمز', soon: 'قريبًا في العرض التجريبي', back: 'رجوع', close: 'إغلاق', confirm: 'تأكيد', cancel: 'إلغاء' },
  tabs: { home: 'الرئيسية', planning: 'احجز', bookings: 'حجوزاتي', wallet: 'M Tokens', tokens: 'الرصيد', profile: 'حسابي' },
  launch: { tagline: 'Move. Recover. Belong.' },
  placeholder: {
    planning: 'جدول الأسبوع يصل يوم الأربعاء.',
    bookings: 'حجوزاتك ورموز QR تصل يوم الخميس.',
    wallet: 'محفظة الرموز تصل يوم الخميس.',
    profile: 'ملفك الشخصي وإعداداتك تصل يوم الجمعة.',
  },
  home: { hello: 'مرحبًا {{name}}', balance: 'رصيدك', seeCatalogue: 'عرض نظام التصميم' },
  catalogue: {
    title: 'الهوية البصرية',
    intro: 'ألوان وخطوط ومكوّنات تطبيق MILIEU، تستعملها كل الشاشات.',
    colors: 'الألوان', type: 'الخطوط', buttons: 'الأزرار', badges: 'الشارات والأماكن', chips: 'المرشّحات',
    cards: 'البطاقات', sheet: 'نافذة التأكيد', states: 'الحالات', openSheet: 'فتح النافذة',
    sheetTitle: 'حجز هذه الحصة؟', sheetBody: 'Lagree · غدًا 18:00 · 4 رموز. سيتبقى لديك 12 رمزًا.',
    empty: 'لا توجد حجوزات قادمة', emptyBody: 'احجز حصتك الأولى من الجدول.',
  },
};
