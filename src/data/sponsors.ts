export interface Sponsor {
  name: string;
  /** مسار الشعار داخل public مثل 'sponsors/cafe.png' (اختياري، وبدونه يظهر الاسم نصاً) */
  logo?: string;
  /** رابط الراعي (اختياري): موقعه أو صفحته على فيسبوك/إنستغرام */
  url?: string;
  /** 'main' = الراعي الرئيسي (أكبر ويظهر في أسفل كل الصفحات)، 'partner' = شريك */
  tier: 'main' | 'partner';
}

/**
 * ===== رعاة الدوري =====
 * اتركها فارغة وما يظهر أي شيء. أضف راعياً وضع شعاره في public/sponsors/ ويظهر فوراً:
 *   { name: 'كافتيريا النخيل', logo: 'sponsors/nakheel.png', url: 'https://example.com', tier: 'main' },
 */
export const SPONSORS: Sponsor[] = [];
