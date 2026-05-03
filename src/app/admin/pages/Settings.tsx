import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { supabase } from '../auth/supabase';
import { AdminHeader } from './AdminHeader';

export const Settings = () => {
  const { user } = useAdminAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) {
      toast.error('8 caractères minimum.');
      return;
    }
    if (pwd !== pwd2) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPwd('');
    setPwd2('');
    toast.success('Mot de passe mis à jour.');
  };

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <AdminHeader
        title="Paramètres"
        subtitle="Profil administrateur et sécurité du compte."
      />

      <div className="grid grid-cols-1 max-w-2xl">
        <section className="bg-[#0f2618] border border-white/5 rounded-2xl p-6">
          <header className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#87A922]/15 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#87A922]" />
            </div>
            <h2 className="text-white text-lg font-medium">Mon compte</h2>
          </header>

          <dl className="text-sm space-y-3 mb-6">
            <div className="flex justify-between gap-4">
              <dt className="text-white/40 uppercase tracking-[0.15em] text-xs">Email</dt>
              <dd className="text-white text-right truncate">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40 uppercase tracking-[0.15em] text-xs">ID</dt>
              <dd className="text-white/70 font-mono text-xs truncate">{user?.id ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40 uppercase tracking-[0.15em] text-xs">Créé le</dt>
              <dd className="text-white/70 text-right">
                {user?.created_at ? new Date(user.created_at).toLocaleString('fr-FR') : '—'}
              </dd>
            </div>
          </dl>

          <form onSubmit={updatePassword} className="space-y-3">
            <h3 className="text-white/60 text-xs uppercase tracking-[0.18em] font-semibold mb-2">
              Changer le mot de passe
            </h3>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Nouveau mot de passe"
              minLength={8}
              required
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#87A922]"
            />
            <input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="Confirmation"
              minLength={8}
              required
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#87A922]"
            />
            <button
              type="submit"
              disabled={busy}
              className="bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-60"
            >
              {busy ? 'Mise à jour...' : 'Enregistrer'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
