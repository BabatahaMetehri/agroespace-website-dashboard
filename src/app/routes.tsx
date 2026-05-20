import { createBrowserRouter, Navigate } from "react-router";

import { MainLayout } from "./layouts/MainLayout";
import { AdminLayout } from "./layouts/AdminLayout";

import { Home } from "./pages/Home";
import { Catalog } from "./pages/Catalog";
import { Technical } from "./pages/Technical";
import { ContactMap } from "./pages/ContactMap";
import { Blog } from "./pages/Blog";
import { BlogDetail } from "./pages/BlogDetail";
import { About } from "./pages/About";
import { Activities } from "./pages/Activities";
import { ServicePage } from "./pages/services/ServicePage";
import { Legal } from "./pages/Legal";
import { NotFound } from "./pages/NotFound";

import { Dashboard } from "./admin/pages/Dashboard";
import { Quotes } from "./admin/pages/Quotes";
import { BlogList } from "./admin/pages/BlogList";
import { BlogEditor } from "./admin/pages/BlogEditor";
import { Products } from "./admin/pages/Products";
import { Featured } from "./admin/pages/Featured";
import { Settings } from "./admin/pages/Settings";
import { Promo } from "./admin/pages/Promo";
import { Documents } from "./admin/pages/Documents";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Home },
      { path: "about", Component: About },
      { path: "services", Component: Activities },
      {
        path: "services/irrigation",
        element: <ServicePage service="irrigation" />,
      },
      {
        path: "services/fertilization",
        element: <ServicePage service="fertilization" />,
      },
      { path: "services/retail", element: <ServicePage service="retail" /> },
      { path: "catalog", Component: Catalog },
      { path: "technical", Component: Technical },
      { path: "contact", Component: ContactMap },
      { path: "blog", Component: Blog },
      { path: "blog/:slug", Component: BlogDetail },
      { path: "legal/:section", Component: Legal },
      // Catch-all: any unknown path under MainLayout shows the 404 page.
      // (admin/* has its own layout + catch-all that redirects to /admin)
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "quotes", Component: Quotes },
      { path: "documents", Component: Documents },
      { path: "blog", Component: BlogList },
      { path: "blog/new", Component: BlogEditor },
      { path: "blog/:slug", Component: BlogEditor },
      { path: "products", Component: Products },
      { path: "featured", Component: Featured },
      { path: "promo", Component: Promo },
      { path: "settings", Component: Settings },
      { path: "*", element: <Navigate to="/admin" replace /> },
    ],
  },
]);
