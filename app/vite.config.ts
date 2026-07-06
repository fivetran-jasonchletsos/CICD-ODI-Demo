import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path: GitHub Pages serves this app at /CICD-ODI-Demo/.
// Override with VITE_BASE=/ when previewing at the root locally.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/CICD-ODI-Demo/',
})
