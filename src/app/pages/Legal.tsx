import { useParams, Link } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';

type Section = 'terms' | 'privacy' | 'notice';

const titles: Record<Section, { fr: string; ar: string; en: string }> = {
  terms: {
    fr: 'Conditions générales',
    ar: 'الشروط العامة',
    en: 'Terms and conditions',
  },
  privacy: {
    fr: 'Politique de confidentialité',
    ar: 'سياسة الخصوصية',
    en: 'Privacy policy',
  },
  notice: {
    fr: 'Mentions légales',
    ar: 'الإشعارات القانونية',
    en: 'Legal notice',
  },
};

const bodies: Record<Section, { fr: string; ar: string; en: string }> = {
  terms: {
    fr: `1. Objet
Les présentes conditions régissent l'utilisation du site agroespace.com et la relation commerciale entre AGROESPACE (« la société ») et tout client ou visiteur (« l'utilisateur »).

2. Devis et commandes
Tout devis émis par AGROESPACE est valable 30 jours sauf mention contraire. Une commande n'est définitive qu'après acceptation écrite du devis et règlement de l'acompte convenu.

3. Garantie et service après-vente
Les pivots installés sont garantis 1 an pièces et main-d'œuvre. Le transport et le montage sont inclus jusqu'à la première rotation. Le service après-vente est assuré par les ingénieurs d'AGROESPACE pendant toute la durée de vie de l'équipement, dans des conditions tarifaires précisées au devis.

4. Données personnelles
Les données collectées via le site sont traitées conformément à la politique de confidentialité. L'utilisateur dispose d'un droit d'accès, de rectification et d'opposition.

5. Litiges
Le droit applicable est le droit algérien. Tout litige sera soumis aux tribunaux compétents d'Alger.`,
    ar: `1. الموضوع
تحكم هذه الشروط استخدام موقع agroespace.com والعلاقة التجارية بين أغروسبيس وأي زبون أو زائر.

2. العروض والطلبات
كل عرض سعر صالح لمدة 30 يوماً ما لم يُذكر خلاف ذلك. لا تُعتبر الطلبية نهائية إلا بعد قبول كتابي ودفع التسبيق.

3. الضمان وخدمة ما بعد البيع
تستفيد المحاور المركّبة من ضمان سنة على القطع واليد العاملة، مع تضمين النقل والتركيب حتى أول دوران.

4. البيانات الشخصية
تُعالج البيانات المجموعة وفقاً لسياسة الخصوصية. يحق للمستخدم الوصول والتصحيح والاعتراض.

5. النزاعات
يُطبَّق القانون الجزائري. أي نزاع يُحال إلى المحاكم المختصة بالجزائر العاصمة.`,
    en: `1. Object
These terms govern the use of agroespace.com and the commercial relationship between AGROESPACE and any client or visitor.

2. Quotes and orders
Each quote is valid for 30 days unless stated otherwise. An order is final only upon written acceptance and payment of the agreed deposit.

3. Warranty and after-sales
Installed pivots come with a 1-year parts-and-labor warranty. Transport and assembly are included up to the first rotation. After-sales is handled by AGROESPACE's engineers for the equipment's lifetime, on the terms detailed in the quote.

4. Personal data
Data collected via the site is processed in accordance with the privacy policy.

5. Disputes
Algerian law applies. Any dispute will be submitted to the competent courts of Algiers.`,
  },
  privacy: {
    fr: `Données collectées
Nous collectons les informations strictement nécessaires au traitement de votre demande : nom, téléphone, email, et tout détail que vous nous transmettez dans le formulaire ou via WhatsApp.

Finalité
Vos données servent uniquement à vous recontacter au sujet de votre projet, à émettre un devis, ou à vous tenir informé(e) lorsque vous y avez consenti (newsletter).

Conservation
Les données sont conservées pendant 3 ans à compter du dernier contact, puis supprimées sauf obligation légale.

Vos droits
Vous pouvez à tout moment demander l'accès, la rectification ou la suppression de vos données en écrivant à contact@agroespace.com.`,
    ar: `البيانات المجموعة
نجمع فقط المعلومات الضرورية: الاسم، الهاتف، البريد الإلكتروني، والتفاصيل التي تقدمونها لنا.

الهدف
تُستعمل البيانات للتواصل بشأن مشروعكم وإصدار عرض السعر.

مدة الحفظ
تُحفظ البيانات لمدة 3 سنوات من آخر تواصل ثم تُحذف.

حقوقكم
يمكنكم طلب الوصول أو التصحيح أو الحذف عبر contact@agroespace.com.`,
    en: `Data we collect
We collect only what we need: name, phone, email, and any detail you provide in the form or on WhatsApp.

Purpose
Your data is used solely to contact you about your project, to issue a quote, or to keep you informed where you have opted in.

Retention
Data is kept for 3 years from the last contact, then deleted unless legal obligations require otherwise.

Your rights
You may request access, correction or deletion at any time by writing to contact@agroespace.com.`,
  },
  notice: {
    fr: `Éditeur du site
AGROESPACE — Bordj El Kifane, Alger, Algérie.
Téléphone : +213 661 391 012
Email : contact@agroespace.com

Hébergement
Site hébergé sur l'infrastructure cloud Supabase / Vercel selon les versions.

Propriété intellectuelle
Tous les contenus (textes, images, logos) sont la propriété d'AGROESPACE ou de leurs ayants droit.`,
    ar: `محرر الموقع
أغروسبيس – برج الكيفان، الجزائر العاصمة، الجزائر.
الهاتف: +213 661 391 012
البريد: contact@agroespace.com

الاستضافة
يُستضاف الموقع على بنية Supabase / Vercel السحابية.

الملكية الفكرية
جميع المحتويات ملك لأغروسبيس أو لأصحاب الحقوق.`,
    en: `Site editor
AGROESPACE — Bordj El Kifane, Algiers, Algeria.
Phone: +213 661 391 012
Email: contact@agroespace.com

Hosting
The site is hosted on Supabase / Vercel cloud infrastructure.

Intellectual property
All content (text, images, logos) belongs to AGROESPACE or their rights holders.`,
  },
};

export const Legal = () => {
  const { section = 'terms' } = useParams();
  const key = (['terms', 'privacy', 'notice'].includes(section) ? section : 'terms') as Section;
  const { lang } = useI18n();

  return (
    <div className="bg-[#f4f7f5] min-h-screen pt-32 pb-24" style={{ position: 'relative' }}>
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="flex gap-3 mb-10 flex-wrap">
          {(['terms', 'privacy', 'notice'] as Section[]).map((s) => (
            <Link
              key={s}
              to={`/legal/${s}`}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-colors ${
                key === s
                  ? 'bg-[#0f2618] text-white border border-transparent'
                  : 'bg-white text-[#0f2618]/70 border border-[#0f2618]/10 hover:text-[#0f2618]'
              }`}
            >
              {titles[s][lang]}
            </Link>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-light text-[#0f2618] mb-10">{titles[key][lang]}</h1>
        <article className="bg-white rounded-3xl p-8 md:p-12 border border-[#0f2618]/5 shadow-[0_15px_40px_rgba(0,0,0,0.03)]">
          <p className="whitespace-pre-line text-[#0f2618]/80 leading-relaxed text-base md:text-[17px]">
            {bodies[key][lang]}
          </p>
        </article>
      </div>
    </div>
  );
};
