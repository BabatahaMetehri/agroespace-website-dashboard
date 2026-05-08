import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Inbox, FileText, Package, ArrowUpRight, Clock } from "lucide-react";
import { useAdminAuth } from "../auth/AuthProvider";
import { AdminHeader } from "./AdminHeader";

type Stats = {
  quotes: {
    total: number;
    pending: number;
    recent: {
      id: string;
      product_title?: string;
      name?: string;
      created_at: string;
      status?: string;
    }[];
  };
  posts: { total: number };
  products: { total: number };
};

const StatusPill = ({ status }: { status?: string }) => {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
    contacted: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    quoted: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    won: "bg-green-500/15 text-green-300 border-green-500/25",
    lost: "bg-red-500/15 text-red-300 border-red-500/25",
  };
  const cls = map[status ?? "pending"] ?? map.pending;
  const label =
    status === "contacted"
      ? "Contacté"
      : status === "quoted"
        ? "Devis envoyé"
        : status === "won"
          ? "Signé"
          : status === "lost"
            ? "Perdu"
            : "En attente";
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide border ${cls}`}
    >
      {label}
    </span>
  );
};

export const Dashboard = () => {
  const { api, user } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>("/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [api]);

  const cards = [
    {
      label: "Devis en attente",
      value: stats?.quotes.pending ?? "—",
      icon: Clock,
      to: "/admin/quotes",
      tone: "text-yellow-300",
    },
    {
      label: "Total demandes",
      value: stats?.quotes.total ?? "—",
      icon: Inbox,
      to: "/admin/quotes",
      tone: "text-[#87A922]",
    },
    {
      label: "Articles publiés",
      value: stats?.posts.total ?? "—",
      icon: FileText,
      to: "/admin/blog",
      tone: "text-blue-300",
    },
    {
      label: "Produits gérés",
      value: stats?.products.total ?? "—",
      icon: Package,
      to: "/admin/products",
      tone: "text-purple-300",
    },
  ];

  return (
    <div className="p-8" style={{ position: "relative" }}>
      <AdminHeader
        title={`Bienvenue${user?.email ? ", " + user.email.split("@")[0].split(".")[0].replace(user.email.split("@")[0].split(".")[0][0], user.email.split("@")[0].split(".")[0][0].toUpperCase()) : ""}`}
        subtitle="Une vue d'ensemble du pipeline commercial et du contenu publié."
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.to}
              className="group bg-[#0f2618] border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <Icon className={`w-5 h-5 ${c.tone}`} strokeWidth={1.5} />
                <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
              </div>
              <div className="text-4xl font-light text-white">{c.value}</div>
              <div className="text-xs text-white/50 uppercase tracking-[0.15em] mt-2">
                {c.label}
              </div>
            </Link>
          );
        })}
      </div>

      <section className="bg-[#0f2618] border border-white/5 rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-white text-lg font-medium">
              Demandes récentes
            </h2>
            <p className="text-white/40 text-sm">Les 5 derniers devis reçus.</p>
          </div>
          <Link
            to="/admin/quotes"
            className="text-xs uppercase tracking-[0.15em] text-[#87A922] hover:text-white"
          >
            Voir tout →
          </Link>
        </header>
        <div className="divide-y divide-white/5">
          {!stats && !error && (
            <p className="px-6 py-8 text-white/40 text-sm">Chargement...</p>
          )}
          {stats?.quotes.recent.length === 0 && (
            <p className="px-6 py-8 text-white/40 text-sm">
              Aucune demande pour le moment.
            </p>
          )}
          {stats?.quotes.recent.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {q.product_title ?? "Demande générale"}
                </div>
                <div className="text-white/50 text-xs mt-0.5">
                  {q.name ?? "—"} ·{" "}
                  {new Date(q.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <StatusPill status={q.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
