import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// LOCAL DEVELOPMENT
// Put this whole repo inside XAMPP's htdocs folder, e.g.
//   Windows: C:\xampp\htdocs\it304-3a-delacruz-juan
//   Mac:     /Applications/XAMPP/xamppfiles/htdocs/it304-3a-delacruz-juan
// While "npm run dev" runs, any request to /api/... is forwarded to
//   http://localhost/<your-repo-folder>/api/...
// so your React code always uses the SAME relative path: fetch('/api/rehearsals.php').
// You don't need to change anything here. The folder name is detected automatically.
const repoFolder = path.basename(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (p) => `/${repoFolder}${p}`,
      },
    },
  },
})
