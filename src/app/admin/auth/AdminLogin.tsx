import { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import logoImg from '../../../imports/logo-with-shadow.png';
import { useAdminAuth } from './AuthProvider';

// Client-side throttle: 5 failed attempts per 15-minute rolling window.
// (Supabase Auth itself has server-side rate limits too — this is UX layer.)
const ATTEMPTS_KEY = 'agroespace.admin.loginAttempts';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function readAttempts(): number[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - WINDOW_MS;
    return arr.filter((t: any) => typeof t === 'number' && t > cutoff);
  } catch {
    return [];
  }
}
function recordFailure() {
  const next = [...readAttempts(), Date.now()];
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
}
function clearAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
}

export const AdminLogin = ({ reason }: { reason?: 'forbidden' | 'signed-out' | null }) => {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [, force] = useState(0);

  // Re-evaluate lock on mount + every second when locked (for countdown).
  useEffect(() => {
    const evaluate = () => {
      const attempts = readAttempts();
      if (attempts.length >= MAX_ATTEMPTS) {
        setLockedUntil(attempts[0] + WINDOW_MS);
      } else {
        setLockedUntil(null);
      }
    };
    evaluate();
    const id = setInterval(() => {
      evaluate();
      force((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const isLocked = lockedUntil !== null && lockedUntil > Date.now();
  const remainingSec = isLocked
    ? Math.ceil(((lockedUntil as number) - Date.now()) / 1000)
    : 0;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - readAttempts().length);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      recordFailure();
      const attempts = readAttempts();
      if (attempts.length >= MAX_ATTEMPTS) {
        setLockedUntil(attempts[0] + WINDOW_MS);
        setError('Trop de tentatives. Réessayez plus tard.');
      } else {
        setError(error);
      }
    } else {
      clearAttempts();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1c12] flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-[#114232] blur-[140px] opacity-50" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-[#87A922] blur-[160px] opacity-15" />
      </div>

      <header className="relative z-10 px-6 md:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImg} alt="AGROESPACE" className="h-10 w-auto object-contain" />
          <span className="text-white font-bold tracking-tight font-serif text-lg">AGROESPACE</span>
        </Link>
        <Link to="/" className="text-white/40 text-xs uppercase tracking-[0.2em] hover:text-white">
          ← Retour au site
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-[#0f2618] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#87A922]/15 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#87A922]" />
            </div>
            <span className="text-[#87A922] uppercase tracking-[0.2em] text-xs font-semibold">
              Espace Admin
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-white leading-tight mb-2">
            Connectez-vous
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Accès réservé aux équipes AGROESPACE.
          </p>

          {reason === 'forbidden' && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 mb-6 text-sm">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Ce compte n'est pas autorisé sur l'espace admin. Contactez l'administrateur pour
                être ajouté à la liste des emails autorisés.
              </span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-[0.15em] mb-2">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#87A922]"
                placeholder="vous@agroespace.com"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-[0.15em] mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-[#87A922]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-300 text-sm">{error}</p>}
            {isLocked && (
              <p className="text-amber-300 text-sm">
                Compte verrouillé temporairement. Réessayez dans{' '}
                {Math.floor(remainingSec / 60)}m {remainingSec % 60}s.
              </p>
            )}
            {!isLocked && remainingAttempts < MAX_ATTEMPTS && remainingAttempts > 0 && (
              <p className="text-white/40 text-xs">
                {remainingAttempts} tentative{remainingAttempts > 1 ? 's' : ''} restante
                {remainingAttempts > 1 ? 's' : ''}.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || isLocked}
              className="w-full bg-[#87A922] hover:bg-[#6c871b] text-white py-4 rounded-2xl font-bold uppercase tracking-[0.1em] text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Connexion...' : isLocked ? 'Verrouillé' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-6 text-xs text-white/40 leading-relaxed">
            Mot de passe oublié ? Contactez un administrateur pour réinitialiser votre compte.
          </p>
        </motion.div>
      </main>
    </div>
  );
};
