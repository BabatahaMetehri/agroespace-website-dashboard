import { Link } from "react-router";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { ClientsCRM } from "../crm/ClientsCRM";

/**
 * Public, login-free preview of the CRM so it can be reviewed while the
 * Supabase dashboard is paused. Seeded with demo data (no real client data);
 * edits persist only in this browser's localStorage. Not linked in the public
 * nav — reachable via /crm-preview. Remove or lock down before launch.
 */
export const CrmPreview = () => (
  <div className="min-h-screen bg-[#0a1c12] text-white font-sans selection:bg-lime selection:text-white" dir="ltr">
    <div className="sticky top-0 z-40 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur px-4 md:px-8 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-amber-200 text-xs md:text-sm">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span>
          Aperçu CRM — <strong>données de démonstration</strong> (aucune donnée réelle). Vos
          modifications restent sur cet appareil.
        </span>
      </div>
      <Link
        to="/"
        className="text-white/60 hover:text-white text-xs inline-flex items-center gap-1 shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Retour au site
      </Link>
    </div>
    <ClientsCRM />
  </div>
);
