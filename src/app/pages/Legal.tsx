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
    fr: `Dernière mise à jour : Mai 2026

1. Présentation
Le présent document régit l'utilisation du site web AGROESPACE (ci-après « le Site »), exploité par AGROESPACE, société de droit algérien spécialisée dans les solutions d'irrigation et matériel agricole, sise à Bordj El Kifane, Alger. En accédant au Site ou en soumettant un formulaire (demande de devis, contact, abonnement), l'utilisateur accepte sans réserve les présentes conditions.

2. Acceptation des Conditions
L'utilisation des services du Site, notamment la soumission d'une demande de devis ou d'un message de contact, implique l'acceptation expresse des présentes Conditions Générales d'Utilisation et de la Politique de Confidentialité associée, conformément à la Loi n° 18-07 du 10 juin 2018, modifiée et complétée par la Loi n° 25-11 du 24 juillet 2025, relative à la protection des personnes physiques dans le traitement des données à caractère personnel.

3. Services Proposés
Le Site permet aux utilisateurs de :
- Consulter le catalogue de produits et services AGROESPACE
- Demander un devis personnalisé
- Nous contacter pour toute information
- S'abonner à notre newsletter
- Lire notre blog technique

4. Devis et Commandes
Tout devis émis par AGROESPACE est valable 30 jours sauf mention contraire. Une commande n'est définitive qu'après acceptation écrite du devis et règlement de l'acompte convenu.

5. Garantie et Service Après-Vente
Les pivots installés sont garantis 1 an pièces et main-d'œuvre. Le transport et le montage sont inclus jusqu'à la première rotation. Le service après-vente est assuré par les ingénieurs d'AGROESPACE pendant toute la durée de vie de l'équipement, dans des conditions tarifaires précisées au devis.

6. Obligations de l'Utilisateur
L'utilisateur s'engage à :
- Fournir des informations exactes, complètes et à jour
- Ne pas utiliser le Site à des fins illégales ou nuisibles
- Respecter les droits de propriété intellectuelle d'AGROESPACE
- Ne pas tenter d'accéder à des zones restreintes du Site

7. Propriété Intellectuelle
Tout le contenu du Site (textes, images, logos, vidéos, articles) est la propriété exclusive d'AGROESPACE. Toute reproduction, modification ou utilisation sans autorisation écrite préalable est strictement interdite.

8. Limitation de Responsabilité
AGROESPACE s'efforce de maintenir le Site accessible et à jour, mais ne peut garantir une disponibilité continue ni l'absence d'erreurs. AGROESPACE ne saurait être tenue responsable des dommages indirects résultant de l'utilisation du Site.

9. Modification des Conditions
AGROESPACE se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront informés par publication sur le Site.

10. Données Personnelles
Les données collectées via le site sont traitées conformément à la Politique de Confidentialité. L'utilisateur dispose des droits d'accès, de rectification, d'effacement, d'opposition et de retrait du consentement.

11. Droit Applicable et Litiges
Les présentes conditions sont régies par le droit algérien. Tout litige sera soumis aux juridictions compétentes d'Alger.

12. Contact
Pour toute question relative aux présentes conditions :
Email : contact@agroespace.com
Adresse : AGROESPACE, Bordj El Kifane, Alger, Algérie`,
    ar: `آخر تحديث: ماي 2026

1. التقديم
يُنظّم هذا المستند استخدام الموقع الإلكتروني AGROESPACE (المشار إليه فيما يلي بـ "الموقع")، الذي تستغله شركة AGROESPACE، وهي شركة خاضعة للقانون الجزائري ومتخصصة في حلول الري والمعدات الفلاحية، يقع مقرها في برج الكيفان، الجزائر العاصمة. بدخول الموقع أو إرسال أي استمارة (طلب عرض سعر، اتصال، اشتراك)، يقبل المستخدم هذه الشروط دون تحفظ.

2. قبول الشروط
يستلزم استخدام خدمات الموقع، خاصةً تقديم طلب عرض سعر أو رسالة اتصال، القبول الصريح لهذه الشروط العامة وسياسة الخصوصية المرفقة، وفقاً للقانون رقم 18-07 المؤرخ في 10 جوان 2018، المعدّل والمتمم بالقانون رقم 25-11 المؤرخ في 24 جويلية 2025، المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي.

3. الخدمات المقدمة
يتيح الموقع للمستخدمين:
- الاطلاع على كتالوج منتجات وخدمات AGROESPACE
- طلب عرض سعر مخصص
- التواصل معنا لأي استفسار
- الاشتراك في النشرة الإخبارية
- قراءة المدونة التقنية

4. العروض والطلبيات
كل عرض سعر صالح لمدة 30 يوماً ما لم يُذكر خلاف ذلك. لا تُعتبر الطلبية نهائية إلا بعد قبول كتابي ودفع التسبيق المتفق عليه.

5. الضمان وخدمة ما بعد البيع
تستفيد المحاور المركّبة من ضمان سنة على القطع واليد العاملة، مع تضمين النقل والتركيب حتى أول دوران. يضمن مهندسو AGROESPACE خدمة ما بعد البيع طوال مدة حياة المعدات، وفقاً للشروط التعريفية المحددة في عرض السعر.

6. التزامات المستخدم
يتعهد المستخدم بـ:
- تقديم معلومات صحيحة وكاملة ومحدّثة
- عدم استخدام الموقع لأغراض غير قانونية أو ضارة
- احترام حقوق الملكية الفكرية لشركة AGROESPACE
- عدم محاولة الدخول إلى مناطق محظورة من الموقع

7. الملكية الفكرية
جميع محتويات الموقع (نصوص، صور، شعارات، فيديوهات، مقالات) هي ملك حصري لشركة AGROESPACE. يُمنع منعاً باتاً أي استنساخ أو تعديل أو استخدام دون إذن كتابي مسبق.

8. حدود المسؤولية
تسعى AGROESPACE إلى الحفاظ على الموقع متاحاً ومحدّثاً، لكنها لا تضمن استمرارية الوصول أو خلوه من الأخطاء. لا يمكن مساءلة AGROESPACE عن الأضرار غير المباشرة الناتجة عن استخدام الموقع.

9. تعديل الشروط
تحتفظ AGROESPACE بحق تعديل هذه الشروط في أي وقت. يتم إعلام المستخدمين عن طريق النشر على الموقع.

10. البيانات الشخصية
تُعالج البيانات المُجمَّعة عبر الموقع وفقاً لسياسة الخصوصية. يتمتع المستخدم بحقوق الوصول والتصحيح والمحو والاعتراض وسحب الموافقة.

11. القانون المطبق والنزاعات
تخضع هذه الشروط للقانون الجزائري. يُحال أي نزاع إلى الجهات القضائية المختصة في الجزائر العاصمة.

12. الاتصال
لأي استفسار يخص هذه الشروط:
البريد الإلكتروني: contact@agroespace.com
العنوان: AGROESPACE، برج الكيفان، الجزائر العاصمة، الجزائر`,
    en: `Last updated: May 2026

1. Introduction
This document governs the use of the AGROESPACE website (the "Site"), operated by AGROESPACE, an Algerian company specialized in irrigation solutions and agricultural equipment, headquartered at Bordj El Kifane, Algiers. By accessing the Site or submitting a form (quote request, contact, subscription), the user unconditionally accepts these terms.

2. Acceptance of Terms
The use of the Site's services, particularly submitting a quote request or contact message, implies the explicit acceptance of these Terms of Service and the associated Privacy Policy, in accordance with Law No. 18-07 of June 10, 2018, amended and supplemented by Law No. 25-11 of July 24, 2025, on the protection of natural persons in the processing of personal data.

3. Services Offered
The Site allows users to:
- Browse the catalog of AGROESPACE products and services
- Request a personalized quote
- Contact us for information
- Subscribe to our newsletter
- Read our technical blog

4. Quotes and Orders
Each quote issued by AGROESPACE is valid for 30 days unless stated otherwise. An order is final only upon written acceptance of the quote and payment of the agreed deposit.

5. Warranty and After-Sales Service
Installed pivots come with a 1-year parts-and-labor warranty. Transport and assembly are included up to the first rotation. After-sales service is provided by AGROESPACE's engineers throughout the equipment's lifetime, on the pricing terms detailed in the quote.

6. User Obligations
The user agrees to:
- Provide accurate, complete, and up-to-date information
- Not use the Site for illegal or harmful purposes
- Respect AGROESPACE's intellectual property rights
- Not attempt to access restricted areas of the Site

7. Intellectual Property
All Site content (texts, images, logos, videos, articles) is the exclusive property of AGROESPACE. Any reproduction, modification, or use without prior written authorization is strictly prohibited.

8. Limitation of Liability
AGROESPACE strives to maintain the Site accessible and up-to-date but cannot guarantee continuous availability or the absence of errors. AGROESPACE shall not be held liable for indirect damages resulting from the use of the Site.

9. Modification of Terms
AGROESPACE reserves the right to modify these terms at any time. Users will be informed through publication on the Site.

10. Personal Data
Data collected through the site is processed in accordance with the Privacy Policy. The user has the rights of access, rectification, erasure, objection, and withdrawal of consent.

11. Applicable Law and Disputes
These terms are governed by Algerian law. Any dispute shall be submitted to the competent jurisdictions of Algiers.

12. Contact
For any questions regarding these terms:
Email: contact@agroespace.com
Address: AGROESPACE, Bordj El Kifane, Algiers, Algeria`,
  },
  privacy: {
    fr: `Conforme à la Loi n° 18-07 (2018) modifiée par la Loi n° 25-11 (2025)
Dernière mise à jour : Mai 2026

1. Responsable du Traitement
Le responsable du traitement des données est :
AGROESPACE
Bordj El Kifane, Alger, Algérie
Email : contact@agroespace.com

2. Données Collectées
Lorsque vous remplissez un formulaire (devis ou contact), nous collectons :
- Identité : nom, prénom
- Coordonnées : email, numéro de téléphone, adresse
- Informations professionnelles : raison sociale, wilaya
- Détails du projet : type de produit, surface, besoins spécifiques

3. Finalités du Traitement
Vos données sont traitées exclusivement pour :
- Répondre à vos demandes de devis ou questions
- Assurer le suivi commercial et le service après-vente
- Vous envoyer notre newsletter (si vous y consentez explicitement)
- Améliorer nos services

4. Base Légale du Traitement
Le traitement de vos données repose sur :
- Votre consentement explicite (case à cocher avant soumission)
- L'exécution d'un contrat ou de mesures précontractuelles (devis)
- Notre intérêt légitime à répondre à vos sollicitations

5. Durée de Conservation
- Données de devis et contact : 3 ans à compter du dernier échange
- Données contractuelles : durée du contrat + 5 ans
- Données de newsletter : jusqu'au retrait du consentement

6. Destinataires des Données
Vos données sont destinées à :
- Le personnel autorisé d'AGROESPACE (commercial, technique, administratif)
- Nos prestataires techniques (hébergement, messagerie) sous contrat de confidentialité

Aucune donnée n'est vendue ni transférée à des tiers à des fins commerciales.

7. Transfert International de Données
Conformément à l'article 45 bis de la loi, aucune donnée n'est transférée hors d'Algérie sans autorisation préalable de l'Autorité Nationale de Protection des Données Personnelles (ANPDP), sauf vers des pays offrant un niveau de protection équivalent.

8. Vos Droits
Conformément aux articles relatifs aux droits des personnes concernées, vous disposez des droits suivants :
- Droit d'information : connaître si vos données sont traitées
- Droit d'accès : obtenir une copie de vos données
- Droit de rectification : corriger des données inexactes
- Droit à l'effacement (droit à l'oubli) : demander la suppression de vos données
- Droit d'opposition : refuser certains traitements
- Droit au retrait du consentement : à tout moment, sans justification

Pour exercer vos droits, contactez-nous à : contact@agroespace.com

9. Sécurité des Données
AGROESPACE met en œuvre des mesures techniques et organisationnelles appropriées : chiffrement des données, contrôles d'accès, sauvegardes sécurisées, formation du personnel.

10. Notification de Violation
En cas de violation de données présentant un risque pour vos droits, nous nous engageons à notifier l'ANPDP dans un délai maximum de 5 jours et à vous informer si le risque est élevé, conformément aux articles 45 bis 8 à 10.

11. Cookies
Le Site utilise des cookies essentiels au fonctionnement et, avec votre consentement, des cookies de performance. Vous pouvez gérer vos préférences à tout moment.

12. Réclamations
Vous avez le droit d'introduire une réclamation auprès de l'Autorité Nationale de Protection des Données Personnelles (ANPDP) si vous estimez que vos droits ne sont pas respectés.

13. Contact
Pour toute question relative à vos données personnelles :
Email : contact@agroespace.com
Adresse : AGROESPACE, Bordj El Kifane, Alger, Algérie`,
    ar: `مطابقة للقانون رقم 18-07 (2018) المعدّل بالقانون 25-11 (2025)
آخر تحديث: ماي 2026

1. المسؤول عن المعالجة
المسؤول عن معالجة البيانات هو:
AGROESPACE
برج الكيفان، الجزائر العاصمة، الجزائر
البريد الإلكتروني: contact@agroespace.com

2. البيانات المُجمَّعة
عند ملء استمارة (عرض سعر أو اتصال)، نجمع:
- الهوية: الاسم واللقب
- معلومات الاتصال: البريد الإلكتروني، رقم الهاتف، العنوان
- معلومات مهنية: الراسمال الاجتماعي، الولاية
- تفاصيل المشروع: نوع المنتج، المساحة، الاحتياجات الخاصة

3. أغراض المعالجة
تُعالَج بياناتك حصرياً للأغراض التالية:
- الرد على طلبات عروض الأسعار أو الاستفسارات
- ضمان المتابعة التجارية وخدمة ما بعد البيع
- إرسال نشرتنا الإخبارية (في حالة موافقتك الصريحة)
- تحسين خدماتنا

4. الأساس القانوني للمعالجة
تستند معالجة بياناتك إلى:
- موافقتك الصريحة (خانة تأشير قبل الإرسال)
- تنفيذ عقد أو تدابير ما قبل التعاقد (عرض السعر)
- مصلحتنا المشروعة في الرد على طلباتك

5. مدة الاحتفاظ
- بيانات عروض الأسعار والاتصال: 3 سنوات من آخر تواصل
- البيانات التعاقدية: مدة العقد + 5 سنوات
- بيانات النشرة الإخبارية: حتى سحب الموافقة

6. مستلمو البيانات
بياناتك موجهة إلى:
- الموظفين المخوّلين في AGROESPACE (تجاري، تقني، إداري)
- مزودي الخدمات التقنية (الاستضافة، البريد) بموجب عقد سرية

لا تُباع أي بيانات أو تُحوّل إلى أطراف ثالثة لأغراض تجارية.

7. النقل الدولي للبيانات
وفقاً للمادة 45 مكرر من القانون، لا تُنقل أي بيانات خارج الجزائر دون إذن مسبق من السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي (ANPDP)، إلا نحو دول توفر مستوى حماية مكافئاً.

8. حقوقك
وفقاً للمواد المتعلقة بحقوق الأشخاص المعنيين، تتمتع بالحقوق التالية:
- حق الاطلاع: معرفة ما إذا كانت بياناتك تُعالَج
- حق الوصول: الحصول على نسخة من بياناتك
- حق التصحيح: تصحيح البيانات الخاطئة
- حق المحو (الحق في النسيان): طلب حذف بياناتك
- حق الاعتراض: رفض بعض المعالجات
- حق سحب الموافقة: في أي وقت، دون مبرر

لممارسة حقوقك، اتصل بنا على: contact@agroespace.com

9. أمن البيانات
تطبّق AGROESPACE تدابير تقنية وتنظيمية مناسبة: تشفير البيانات، ضوابط الوصول، نسخ احتياطية آمنة، تدريب الموظفين.

10. الإخطار بالخرق
في حالة خرق البيانات الذي يُشكّل خطراً على حقوقك، نتعهّد بإخطار السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي (ANPDP) خلال أجل أقصاه 5 أيام، وإعلامك إذا كان الخطر مرتفعاً، وفقاً للمواد 45 مكرر 8 إلى 10.

11. ملفات تعريف الارتباط (Cookies)
يستخدم الموقع ملفات تعريف ارتباط ضرورية لتشغيله، وبموافقتك، ملفات تعريف ارتباط لقياس الأداء. يمكنك إدارة تفضيلاتك في أي وقت.

12. الشكاوى
يحقّ لك تقديم شكوى لدى السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي (ANPDP) إذا رأيت أن حقوقك غير محترمة.

13. الاتصال
لأي استفسار يخصّ بياناتك الشخصية:
البريد الإلكتروني: contact@agroespace.com
العنوان: AGROESPACE، برج الكيفان، الجزائر العاصمة، الجزائر`,
    en: `Compliant with Law No. 18-07 (2018) amended by Law No. 25-11 (2025)
Last updated: May 2026

1. Data Controller
The data controller is:
AGROESPACE
Bordj El Kifane, Algiers, Algeria
Email: contact@agroespace.com

2. Data Collected
When you fill out a form (quote or contact), we collect:
- Identity: first and last name
- Contact details: email, phone number, address
- Professional information: company name, wilaya
- Project details: product type, surface area, specific needs

3. Purposes of Processing
Your data is processed exclusively to:
- Respond to your quote requests or questions
- Ensure commercial follow-up and after-sales service
- Send you our newsletter (if you explicitly consent)
- Improve our services

4. Legal Basis for Processing
The processing of your data is based on:
- Your explicit consent (checkbox before submission)
- The performance of a contract or pre-contractual measures (quotes)
- Our legitimate interest in responding to your inquiries

5. Retention Period
- Quote and contact data: 3 years from the last exchange
- Contractual data: contract duration + 5 years
- Newsletter data: until consent is withdrawn

6. Data Recipients
Your data is intended for:
- Authorized AGROESPACE staff (sales, technical, administrative)
- Our technical service providers (hosting, email) under confidentiality agreements

No data is sold or transferred to third parties for commercial purposes.

7. International Data Transfer
In accordance with Article 45 bis of the law, no data is transferred outside Algeria without prior authorization from the National Authority for the Protection of Personal Data (ANPDP), except to countries offering an equivalent level of protection.

8. Your Rights
In accordance with the articles relating to the rights of data subjects, you have the following rights:
- Right to information: to know if your data is being processed
- Right of access: to obtain a copy of your data
- Right to rectification: to correct inaccurate data
- Right to erasure (right to be forgotten): to request the deletion of your data
- Right to object: to refuse certain processing
- Right to withdraw consent: at any time, without justification

To exercise your rights, contact us at: contact@agroespace.com

9. Data Security
AGROESPACE implements appropriate technical and organizational measures: data encryption, access controls, secure backups, staff training.

10. Breach Notification
In the event of a data breach posing a risk to your rights, we commit to notifying the ANPDP within a maximum of 5 days and informing you if the risk is high, in accordance with Articles 45 bis 8 to 10.

11. Cookies
The Site uses cookies essential to its operation and, with your consent, performance cookies. You can manage your preferences at any time.

12. Complaints
You have the right to lodge a complaint with the National Authority for the Protection of Personal Data (ANPDP) if you believe your rights are not being respected.

13. Contact
For any questions regarding your personal data:
Email: contact@agroespace.com
Address: AGROESPACE, Bordj El Kifane, Algiers, Algeria`,
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
    <div className="bg-paper min-h-screen pt-32 pb-24" style={{ position: 'relative' }}>
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="flex gap-3 mb-10 flex-wrap">
          {(['terms', 'privacy', 'notice'] as Section[]).map((s) => (
            <Link
              key={s}
              to={`/legal/${s}`}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-colors ${
                key === s
                  ? 'bg-forest text-white border border-transparent'
                  : 'bg-white text-forest/70 border border-forest/10 hover:text-forest'
              }`}
            >
              {titles[s][lang]}
            </Link>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-light text-forest mb-10">{titles[key][lang]}</h1>
        <article className="bg-white rounded-3xl p-8 md:p-12 border border-[#0f2618]/5 shadow-[0_15px_40px_rgba(0,0,0,0.03)]">
          <p className="whitespace-pre-line text-forest/80 leading-relaxed text-base md:text-[17px]">
            {bodies[key][lang]}
          </p>
        </article>
      </div>
    </div>
  );
};
