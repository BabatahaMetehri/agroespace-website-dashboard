import { defineConfig, loadEnv } from 'vite'
import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Replaces placeholder markers in public/map/index.html at build time so the
// standalone map app can read its Supabase + imgBB credentials from env vars
// instead of having them committed to git.
function mapEnvInjector(env: Record<string, string>) {
  return {
    name: 'agroespace-map-env-inject',
    apply: 'build' as const,
    closeBundle() {
      // Try common Vite output dirs ('dist', 'build') and patch whichever
      // exists. Leave source `public/map/index.html` untouched so it stays
      // safe to commit (placeholders only).
      for (const out of ['dist', 'build']) {
        const fileToPatch = path.resolve(__dirname, out, 'map/index.html')
        if (!fs.existsSync(fileToPatch)) continue
        try {
          let html = fs.readFileSync(fileToPatch, 'utf8')
          html = html
            .replace(/__MAP_SUPABASE_URL__/g, env.VITE_MAP_SUPABASE_URL ?? '')
            .replace(/__MAP_SUPABASE_ANON_KEY__/g, env.VITE_MAP_SUPABASE_ANON_KEY ?? '')
            .replace(/__IMGBB_KEY__/g, env.VITE_IMGBB_KEY ?? '')
          fs.writeFileSync(fileToPatch, html)
        } catch {
          // best effort
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    mapEnvInjector(env),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
