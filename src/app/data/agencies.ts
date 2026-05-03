export type Agency = {
  id: string;
  city: string;
  type: { fr: string; ar: string; en: string };
  fullCity: { fr: string; ar: string; en: string };
  address: { fr: string; ar: string; en: string };
  phone: string;
  phoneDisplay: string;
  map: string;
  // Embed-friendly preview using a Google Maps query for the address
  embedQuery: string;
};

export const agencies: Agency[] = [
  {
    id: 'alger',
    city: 'Alger',
    type: { fr: 'Bureau de liaison', ar: 'مكتب تمثيل', en: 'Liaison office' },
    fullCity: { fr: 'Alger – Bureau de liaison', ar: 'الجزائر العاصمة – مكتب تمثيل', en: 'Algiers – Liaison office' },
    address: {
      fr: 'Bordj El Kifane, Alger, Algérie',
      ar: 'برج الكيفان، الجزائر العاصمة، الجزائر',
      en: 'Bordj El Kifane, Algiers, Algeria',
    },
    phone: '+213661391012',
    phoneDisplay: '(+213) 661 391 012',
    map: 'https://maps.app.goo.gl/uNFCa9CCB9bD9WyH6',
    embedQuery: 'AGROESPACE+Bordj+El+Kifane+Alger+Algerie',
  },
  {
    id: 'ghardaia',
    city: 'Ghardaïa',
    type: { fr: 'Entrepôt', ar: 'مستودع', en: 'Warehouse' },
    fullCity: { fr: 'Ghardaïa – Entrepôt', ar: 'غرداية – مستودع', en: 'Ghardaïa – Warehouse' },
    address: {
      fr: 'Zone Industrielle, Ghardaïa, Algérie',
      ar: 'المنطقة الصناعية، غرداية، الجزائر',
      en: 'Industrial Zone, Ghardaïa, Algeria',
    },
    phone: '+213661391048',
    phoneDisplay: '(+213) 661 391 048',
    map: 'https://maps.app.goo.gl/o55HFJJnp4dHgjAn7',
    embedQuery: 'AGROESPACE+Zone+Industrielle+Ghardaia+Algerie',
  },
  {
    id: 'el-meniaa',
    city: 'El Meniaa',
    type: { fr: 'Showroom', ar: 'معرض', en: 'Showroom' },
    fullCity: { fr: 'El Meniaa – Showroom', ar: 'المنيعة – معرض', en: 'El Meniaa – Showroom' },
    address: {
      fr: 'Hoffrat El Abbas, El Meniaa, Algérie',
      ar: 'حفرة العباس، المنيعة، الجزائر',
      en: 'Hoffrat El Abbas, El Meniaa, Algeria',
    },
    phone: '+213661391336',
    phoneDisplay: '(+213) 661 391 336',
    map: 'https://maps.app.goo.gl/MhxLPLPgLvzGLDrs8',
    embedQuery: 'AGROESPACE+Hoffrat+El+Abbas+El+Meniaa+Algerie',
  },
  {
    id: 'adrar',
    city: 'Adrar',
    type: { fr: 'Showroom', ar: 'معرض', en: 'Showroom' },
    fullCity: { fr: 'Adrar – Showroom', ar: 'أدرار – معرض', en: 'Adrar – Showroom' },
    address: {
      fr: 'Rue Palestine, Hattaba, Adrar, Algérie',
      ar: 'شارع فلسطين، حطابة، أدرار، الجزائر',
      en: 'Rue Palestine, Hattaba, Adrar, Algeria',
    },
    phone: '+213668716684',
    phoneDisplay: '(+213) 668 716 684',
    map: 'https://maps.app.goo.gl/CmDxnDh8RNfFhkLm6',
    embedQuery: 'AGROESPACE+Rue+Palestine+Hattaba+Adrar+Algerie',
  },
];
