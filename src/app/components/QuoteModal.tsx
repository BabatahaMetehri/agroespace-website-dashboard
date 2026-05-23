import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Phone, Check } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

type Props = {
  open: boolean;
  onClose: () => void;
  product: { id: number | string; sku?: string; title: string };
};

export const QuoteModal = ({ open, onClose, product }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accepted) {
      toast.error('Veuillez accepter les conditions.');
      return;
    }
    const form = new FormData(e.currentTarget);
    const payload = {
      product_id: product.id,
      product_sku: product.sku,
      product_title: product.title,
      name: form.get('name'),
      phone: form.get('phone'),
      email: form.get('email'),
      company: form.get('company'),
      address: form.get('address'),
      message: form.get('message'),
      created_at: new Date().toISOString(),
    };

    setSubmitting(true);
    // Best effort to persist via Supabase edge function. We open WhatsApp regardless
    // so the customer always gets a fast path to administration.
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0c561120/quotes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(payload),
        }
      ).catch(() => null);
    } finally {
      setSubmitting(false);
    }

    const text = `Bonjour AGROESPACE,%0A%0ADemande de devis :%0AProduit : ${product.title}${
      product.sku ? ' (' + product.sku + ')' : ''
    }%0ANom : ${payload.name}%0AEntreprise : ${payload.company ?? '-'}%0ATéléphone : ${payload.phone}%0AAdresse : ${payload.address ?? '-'}%0AEmail : ${payload.email ?? '-'}%0A%0A${payload.message ?? ''}`;
    window.open(`https://wa.me/213670635013?text=${text}`, '_blank');
    toast.success('Demande envoyée', { description: 'Nous vous répondons dans la journée.' });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-[#0a1c12]/85 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-[#0f2618] border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl p-8 md:p-10 text-white max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[#87A922] uppercase tracking-[0.2em] text-xs font-semibold mb-3 block">
              Demande de devis
            </span>
            <h3 className="text-3xl font-light mb-2">{product.title}</h3>
            {product.sku && <p className="text-white/40 text-xs font-mono mb-6">{product.sku}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Nom complet"
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                />
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={30}
                  pattern="[+\d][\d\s().\-]{5,24}"
                  autoComplete="tel"
                  placeholder="Téléphone"
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  placeholder="Email"
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                />
                <input
                  name="company"
                  maxLength={150}
                  autoComplete="organization"
                  placeholder="Entreprise / ferme"
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                />
              </div>
              <input
                name="address"
                maxLength={200}
                placeholder="Adresse / Wilaya"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
              />
              <textarea
                name="message"
                rows={3}
                maxLength={2000}
                placeholder="Surface, contraintes, calendrier..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#87A922] resize-none"
              />

              {/* Consent */}
              <label className="flex items-start gap-3 cursor-pointer py-1">
                <span className="mt-0.5 relative flex items-center justify-center w-5 h-5 rounded border border-white/30 bg-transparent flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="absolute w-full h-full opacity-0 cursor-pointer peer"
                  />
                  <Check className="w-3 h-3 text-[#87A922] opacity-0 peer-checked:opacity-100 transition-opacity" />
                </span>
                <span className="text-white/60 text-sm leading-relaxed">
                  J'accepte les{' '}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    conditions générales
                  </a>{' '}
                  et la{' '}
                  <a
                    href="/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    politique de confidentialité
                  </a>{' '}
                  d'AGROESPACE.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !accepted}
                  className="flex-1 bg-[#25D366] hover:bg-[#1fad53] text-white rounded-full px-6 py-4 font-bold uppercase tracking-[0.1em] text-sm transition-colors flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  Envoyer & ouvrir WhatsApp
                </button>
                <a
                  href="tel:+213670635013"
                  className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full px-6 py-4 font-bold uppercase tracking-[0.1em] text-sm transition-colors"
                >
                  <Phone className="w-4 h-4" /> Appeler
                </a>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
