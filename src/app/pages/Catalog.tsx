import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useI18n } from "../i18n/I18nProvider";
import { QuoteModal } from "../components/QuoteModal";
import { FUNCTIONS_BASE } from "../admin/auth/supabase";

type WcProduct = {
  id: number;
  sku?: string;
  name?: string;
  description?: string;
  regular_price?: string;
  sale_price?: string;
  stock_status?: string;
  stock_quantity?: number;
  categories?: { id: number; name: string }[];
  images?: { src: string }[];
  image?: string;
};

type Product = {
  id: number;
  sku: string;
  title: string;
  category: string;
  image: string;
  inStock: boolean;
  price: string | null;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1611040549344-f71005756038?w=600&q=80";

function mapProduct(p: WcProduct): Product {
  const imageUrl =
    p.images?.[0]?.src ||
    p.image ||
    FALLBACK_IMAGE;

  const categoryName =
    p.categories?.[0]?.name ?? "Produits";

  // Public-facing catalog hides prices on purpose — visitors always go through
  // the quote flow. Admin still sees regular_price/sale_price in /admin/products.
  const price: string | null = null;

  return {
    id: p.id,
    sku: p.sku ?? `SKU-${p.id}`,
    title: p.name ?? "Produit",
    category: categoryName,
    image: imageUrl,
    inStock: p.stock_status !== "outofstock",
    price,
  };
}

export const Catalog = () => {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("Tous");
  const [quoteFor, setQuoteFor] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  useEffect(() => {
    fetch(`${FUNCTIONS_BASE}/public/products`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<WcProduct[]>;
      })
      .then((data) => setProducts(data.map(mapProduct)))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Build category list dynamically from actual products
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ["Tous", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = active === "Tous" || p.category === active;
      const matchesQuery =
        q === "" ||
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, active, products]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [query, active]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const catLabel = (c: string) => (c === "Tous" ? t("catalog.all") : c);

  return (
    <div
      className="bg-[#0a1c12] min-h-screen pt-32 pb-24 text-white"
      style={{ position: "relative" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
          <div>
            <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
              {t("nav.products")}
            </span>
            <h1 className="text-4xl md:text-6xl font-light text-white leading-tight">
              {t("catalog.hero.title.1")}{" "}
              <span className="font-serif italic text-white/80">{t("catalog.hero.title.italic")}</span>
            </h1>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder={t("catalog.search")}
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 ps-12 pe-4 text-white focus:outline-none focus:border-[#87A922] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-colors ${
                active === c
                  ? "bg-[#87A922] text-white border border-transparent"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#87A922] animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-24">
            <p className="text-white/40 text-sm">
              Impossible de charger les produits. Veuillez réessayer.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-white/40 text-sm">
              {query
                ? "Aucun produit ne correspond à votre recherche."
                : "Aucun produit disponible pour le moment."}
            </p>
          </div>
        )}

        {/* Product grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginated.map((product, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={product.id}
                className="group bg-[#0f2618] border border-white/5 rounded-3xl overflow-hidden hover:border-white/20 transition-all duration-500 flex flex-col"
              >
                <div className="relative aspect-square overflow-hidden bg-black/50">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-start">
                    {product.inStock ? (
                      <span className="bg-[#87A922] text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                        {t("catalog.instock")}
                      </span>
                    ) : (
                      <span className="bg-red-500/90 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                        {t("catalog.outofstock")}
                      </span>
                    )}
                    <span className="bg-white/10 backdrop-blur-md text-white/80 text-[10px] uppercase tracking-[0.18em] px-3 py-1 rounded-full">
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-1">
                  <div className="text-white/40 text-xs font-mono mb-3">
                    {product.sku}
                  </div>
                  {/* Dynamic font-size + line clamp so long product names
                      don't blow up the card height. Tier the size by length:
                      ≤30 = 2xl, ≤55 = xl, ≤90 = lg, longer = base. Always
                      clamp to 3 lines max with an ellipsis. */}
                  {(() => {
                    const len = product.title.length;
                    const sizeClass =
                      len <= 30 ? 'text-2xl'
                      : len <= 55 ? 'text-xl'
                      : len <= 90 ? 'text-lg'
                      : 'text-base';
                    return (
                      <h3
                        title={product.title}
                        className={`${sizeClass} font-medium text-white mb-8 leading-tight line-clamp-3 break-words [overflow-wrap:anywhere]`}
                      >
                        {product.title}
                      </h3>
                    );
                  })()}

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    {product.price ? (
                      <div className="text-[#87A922] font-medium text-xl">
                        {product.price}
                      </div>
                    ) : (
                      <button
                        onClick={() => setQuoteFor(product)}
                        className="text-white hover:text-[#87A922] font-medium text-sm flex items-center gap-2 transition-colors"
                      >
                        {t("catalog.quote")} <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {product.price && (
                      <button
                        onClick={() => setQuoteFor(product)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#87A922] transition-colors"
                        aria-label={t("catalog.quote")}
                      >
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-10 h-10 px-3 rounded-full text-sm font-semibold transition-colors ${
                  n === safePage
                    ? "bg-[#87A922] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <QuoteModal
        open={!!quoteFor}
        onClose={() => setQuoteFor(null)}
        product={quoteFor ?? { id: 0, title: "" }}
      />
    </div>
  );
};
