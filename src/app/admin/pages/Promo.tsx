import { useEffect, useRef, useState } from 'react';
import { Megaphone, Save, ToggleLeft, ToggleRight, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';

const IMGBB_KEY = '532fd551c5b06a6333c0e63bec0d122b';

type PromoConfig = {
  id: string;
  isActive: boolean;
  badge: string;
  eyebrow: string;
  title: string;
  titleSuffix: string;
  description: string;
  dates: string;
  location: string;
  locationDetail: string;
  ctaText: string;
  image: string;
};

const PROMO_DEFAULTS: PromoConfig = {
  id: 'sipsa-2026',
  isActive: false,
  badge: 'Événement Majeur',
  eyebrow: 'Rejoignez-nous au',
  title: 'SIPSA',
  titleSuffix: '2026',
  description:
    "AGROESPACE sera présent au Salon International de l'Agriculture. Venez découvrir nos dernières innovations en matière d'irrigation de précision et échanger avec nos ingénieurs experts.",
  dates: '20 - 23 Mai 2026',
  location: 'SAFEX - Pins Maritimes, Alger',
  locationDetail: 'Pavillon Central, Stand A-15',
  ctaText: 'Planifier une visite',
  image: 'https://www.sipsa-filaha.com/wp-content/uploads/2025/05/sipsa-filaha-2025.jpg',
};

async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Upload failed');
  return (json.data?.display_url ?? json.data?.url) as string;
}

export const Promo = () => {
  const { api } = useAdminAuth();
  const [promo, setPromo] = useState<PromoConfig>(PROMO_DEFAULTS);
  const [loadingPromo, setLoadingPromo] = useState(true);
  const [savingPromo, setSavingPromo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<PromoConfig | null>('/admin/promo')
      .then((data) => {
        if (data) setPromo(data);
      })
      .catch(() => {/* 404 = no promo yet, keep defaults */})
      .finally(() => setLoadingPromo(false));
  }, [api]);

  const updateField = <K extends keyof PromoConfig>(key: K, value: PromoConfig[K]) =>
    setPromo((p) => ({ ...p, [key]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingImage(true);
    try {
      const url = await uploadToImgBB(file);
      updateField('image', url);
      toast.success('Image téléchargée');
    } catch (err) {
      toast.error(`Échec : ${(err as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const savePromo = async () => {
    setSavingPromo(true);
    try {
      const saved = await api<PromoConfig>('/admin/promo', {
        method: 'PUT',
        body: JSON.stringify(promo),
      });
      setPromo(saved);
      toast.success('Configuration promo sauvegardée');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingPromo(false);
    }
  };

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <AdminHeader
        title="Bannière Promo"
        subtitle="Configure le pop-up promotionnel affiché aux visiteurs du site."
        actions={
          <>
            <button
              onClick={() => updateField('isActive', !promo.isActive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.12em] border transition-colors ${
                promo.isActive
                  ? 'bg-[#87A922]/15 text-[#87A922] border-[#87A922]/30 hover:bg-[#87A922]/25'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {promo.isActive ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              {promo.isActive ? 'Actif' : 'Inactif'}
            </button>
            <button
              onClick={savePromo}
              disabled={savingPromo || loadingPromo || uploadingImage}
              className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {savingPromo ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </>
        }
      />

      <section className="bg-[#0f2618] border border-white/5 rounded-2xl overflow-hidden">
        <header className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <Megaphone className="w-5 h-5 text-[#87A922]" strokeWidth={1.5} />
          <h2 className="text-white text-lg font-medium">Contenu de la bannière</h2>
        </header>

        {loadingPromo ? (
          <div className="px-6 py-8 text-white/40 text-sm">Chargement…</div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <PromoField label="ID de campagne" hint="Change l'ID pour réafficher le pop-up aux visiteurs qui l'avaient fermé">
              <input
                value={promo.id}
                onChange={(e) => updateField('id', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="sipsa-2026"
              />
            </PromoField>

            <PromoField label="Badge">
              <input
                value={promo.badge}
                onChange={(e) => updateField('badge', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="Événement Majeur"
              />
            </PromoField>

            <PromoField label="Accroche (eyebrow)">
              <input
                value={promo.eyebrow}
                onChange={(e) => updateField('eyebrow', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="Rejoignez-nous au"
              />
            </PromoField>

            <div className="flex gap-3">
              <PromoField label="Titre" className="flex-1">
                <input
                  value={promo.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                  placeholder="SIPSA"
                />
              </PromoField>
              <PromoField label="Suffixe" className="w-28">
                <input
                  value={promo.titleSuffix}
                  onChange={(e) => updateField('titleSuffix', e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                  placeholder="2026"
                />
              </PromoField>
            </div>

            <PromoField label="Dates">
              <input
                value={promo.dates}
                onChange={(e) => updateField('dates', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="20 - 23 Mai 2026"
              />
            </PromoField>

            <PromoField label="Lieu">
              <input
                value={promo.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="SAFEX - Pins Maritimes, Alger"
              />
            </PromoField>

            <PromoField label="Détail lieu">
              <input
                value={promo.locationDetail}
                onChange={(e) => updateField('locationDetail', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="Pavillon Central, Stand A-15"
              />
            </PromoField>

            <PromoField label="Texte bouton CTA">
              <input
                value={promo.ctaText}
                onChange={(e) => updateField('ctaText', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="Planifier une visite"
              />
            </PromoField>

            <div className="md:col-span-2">
              <PromoField label="Description">
                <textarea
                  value={promo.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#87A922] resize-none"
                />
              </PromoField>
            </div>

            <div className="md:col-span-2">
              <PromoField label="Image (URL ou upload)">
                <div className="flex gap-2 mb-2">
                  <input
                    value={promo.image}
                    onChange={(e) => updateField('image', e.target.value)}
                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                    placeholder="https://i.ibb.co/.../banner.jpg"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-[0.15em] font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingImage ? 'Import…' : 'Importer'}
                  </button>
                </div>
                {promo.image && (
                  <div className="h-32 rounded-xl overflow-hidden bg-black/40">
                    <img src={promo.image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </PromoField>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

const PromoField = ({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <label className={`block ${className ?? ''}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-white/50 text-xs uppercase tracking-[0.15em] font-semibold">{label}</span>
      {hint && <span className="text-white/25 text-[11px] max-w-[55%] text-right">{hint}</span>}
    </div>
    {children}
  </label>
);
