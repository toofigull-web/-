import type { Dictionary } from './types';

export const dictionary = {
  // App header & logo placeholder
  'app.name': {
    ar: 'app',
    en: 'app',
  },
  'app.phase1Placeholder': {
    ar: 'Phase 1 — foundation only',
    en: 'Phase 1 — foundation only',
  },
  'app.phase1Subtitle': {
    ar: 'المرحلة 1 — الأساس والبنية التحتية فقط',
    en: 'Phase 1 — foundation and infrastructure only',
  },
  'app.phase1Description': {
    ar: 'تم بناء الهيكل الأساسي للواجهة، دعم اتجاه RTL واللغة العربية افتراضياً مع إمكانية التبديل إلى الإنجليزية، ونظام الرموز التصميمية ومكونات الواجهة المشتركة.',
    en: 'Core application shell built with native RTL Arabic as default, switchable to English, typed design tokens, and shared UI primitives.',
  },
  'app.languageSwitchLabel': {
    ar: 'English',
    en: 'العربية',
  },
  'app.switchLanguage': {
    ar: 'التبديل إلى الإنجليزية',
    en: 'Switch to Arabic',
  },
  'app.currentLanguage': {
    ar: 'اللغة الحالية: العربية (RTL)',
    en: 'Current Language: English (LTR)',
  },

  // Upload Step Feature
  'upload.title': {
    ar: 'اختر الصور',
    en: 'Choose images',
  },
  'upload.description': {
    ar: 'كل صورة تصبح مشهداً مستقلاً في الفيديو',
    en: 'Each image becomes its own scene in the video',
  },
  'upload.clickToAdd': {
    ar: 'انقر لإضافة صورة أو أكثر',
    en: 'Click to add one or more images',
  },
  'upload.dropPrompt': {
    ar: 'أو اسحب وأفلت الصور هنا — بصيغة PNG أو JPG',
    en: 'or drop images here — PNG or JPG',
  },
  'upload.dropActive': {
    ar: 'أفلت الصور هنا لإضافتها الآن...',
    en: 'Drop images here to add them now...',
  },
  'upload.maxSizeNote': {
    ar: 'الحد الأقصى 25 ميغابايت لكل صورة',
    en: 'Maximum 25MB per image',
  },
  'upload.dropzoneAria': {
    ar: 'منطقة رفع الصور، اضغط Enter أو مسافة لفتح نافذة اختيار الملفات',
    en: 'Image upload drop zone, press Enter or Space to open file picker',
  },
  'upload.counter.zero': {
    ar: 'لم يتم اختيار أي صورة بعد',
    en: '0 images selected',
  },
  'upload.counter.one': {
    ar: 'صورة واحدة مختارة',
    en: '1 image selected',
  },
  'upload.counter.two': {
    ar: 'صورتان مختارتان',
    en: '2 images selected',
  },
  'upload.counter.few': {
    ar: '{count} صور مختارة',
    en: '{count} images selected',
  },
  'upload.counter.many': {
    ar: '{count} صورة مختارة',
    en: '{count} images selected',
  },
  'upload.sceneLabel': {
    ar: 'مشهد {index}',
    en: 'Scene {index}',
  },
  'upload.removeImage': {
    ar: 'حذف الصورة {name}',
    en: 'Remove image {name}',
  },
  'upload.clearAll': {
    ar: 'مسح الكل',
    en: 'Clear all',
  },
  'upload.addMore': {
    ar: 'إضافة المزيد من الصور',
    en: 'Add more images',
  },
  'upload.next': {
    ar: 'التالي: إعداد المشاهد',
    en: 'Next: Scene Setup',
  },
  'upload.nextTooltip': {
    ar: 'اختر صورة واحدة على الأقل للمتابعة',
    en: 'Select at least one image to continue',
  },
  'upload.error.title': {
    ar: 'تعذر إضافة بعض الملفات',
    en: 'Some files could not be added',
  },
  'upload.error.invalidType': {
    ar: 'الملف «{name}» ليس من صيغ PNG أو JPG المدعومة',
    en: "File '{name}' is not an accepted PNG or JPG format",
  },
  'upload.error.fileTooLarge': {
    ar: 'الملف «{name}» يتجاوز الحد الأقصى المسموح به (25 ميغابايت)',
    en: "File '{name}' exceeds the maximum allowed size (25MB)",
  },
  'upload.error.decodeFailed': {
    ar: 'تعذر فك ترميز أبعاد الصورة «{name}»',
    en: "Could not decode image dimensions for '{name}'",
  },
  'upload.error.dismiss': {
    ar: 'تجاهل',
    en: 'Dismiss',
  },
  'upload.error.dismissAll': {
    ar: 'تجاهل الكل',
    en: 'Dismiss all',
  },

  // Scene List Step Feature (Phase 3)
  'scenes.title': {
    ar: 'معاينة مشاهد الفيديو',
    en: 'Video Scenes Preview',
  },
  'scenes.description': {
    ar: 'معاينة الرسم الثابت لكل مشهد بنسبة العرض 9:16 مع ضبط الأبعاد والاحتواء المناسب',
    en: 'Static canvas preview for each scene in 9:16 aspect ratio with contain-fit framing',
  },
  'scenes.sceneNumber': {
    ar: 'مشهد {number}',
    en: 'Scene {number}',
  },
  'scenes.totalCount': {
    ar: '{count} مشاهد',
    en: '{count} scenes',
  },
  'scenes.totalDuration': {
    ar: 'المدة الإجمالية: {duration}',
    en: 'Total duration: {duration}',
  },
  'scenes.aspectRatio': {
    ar: 'نسبة العرض',
    en: 'Aspect ratio',
  },
  'scenes.durationLabel': {
    ar: 'المدة الكلية',
    en: 'Total duration',
  },
  'scenes.holdLabel': {
    ar: 'مدة الثبات',
    en: 'Hold time',
  },
  'scenes.emptyNotice': {
    ar: 'قم برفع صورة واحدة على الأقل أعلاه لتوليد المشاهد تلقائياً',
    en: 'Upload at least one image above to generate scenes automatically',
  },

  // Primitives Showcase section (kept for backwards compatibility if needed)
  'primitives.title': {
    ar: 'المكونات الأساسية المشتركة',
    en: 'Shared Low-Level Primitives',
  },
  'primitives.description': {
    ar: 'مكونات مجردة مبنية وفقاً لرموز التصميم دون أي اعتماديات خارجية.',
    en: 'Bare primitives styled directly with design tokens.',
  },
  'primitives.buttonPrimary': {
    ar: 'زر رئيسي',
    en: 'Primary Button',
  },
  'primitives.buttonSecondary': {
    ar: 'زر ثانوي',
    en: 'Secondary Button',
  },
  'primitives.buttonDanger': {
    ar: 'زر تحذيري',
    en: 'Danger Button',
  },
  'primitives.buttonDisabled': {
    ar: 'زر معطّل',
    en: 'Disabled Button',
  },
  'primitives.cardTitle': {
    ar: 'بطاقة اختبار الرموز التصميمية',
    en: 'Design Tokens Test Card',
  },
  'primitives.cardText': {
    ar: 'تستخدم هذه البطاقة متغيرات الألوان، والحدود، وظلال النظام المحددة بدقة.',
    en: 'This card uses surface colors, lines, and system shadows precisely specified.',
  },
  'primitives.toggleLabel': {
    ar: 'مفتاح تبديل الحالة',
    en: 'State Toggle Switch',
  },
  'primitives.sliderLabel': {
    ar: 'شريط تمرير القيمة',
    en: 'Value Slider',
  },
  'primitives.sliderValue': {
    ar: 'القيمة المختارة',
    en: 'Selected value',
  },

  // Footer links (placeholder links, non-functional)
  'footer.privacy': {
    ar: 'سياسة الخصوصية',
    en: 'Privacy Policy',
  },
  'footer.terms': {
    ar: 'شروط الاستخدام',
    en: 'Terms of Service',
  },
  'footer.documentation': {
    ar: 'التوثيق الفني',
    en: 'Documentation',
  },
  'footer.support': {
    ar: 'مركز الدعم',
    en: 'Support Center',
  },
  'footer.copyright': {
    ar: 'جميع الحقوق محفوظة © Phase 3',
    en: 'All rights reserved © Phase 3',
  },
} as const satisfies Dictionary;

export type TranslationKey = keyof typeof dictionary;
