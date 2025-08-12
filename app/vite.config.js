import { defineConfig } from 'vite'
import netlify from '@netlify/vite-plugin'

export default defineConfig({
  plugins: [netlify()],
  envDir: '.',  // Look for .env files in project root
  envPrefix: ['VITE_', 'SPOTIFY_'],  // Include SPOTIFY_ vars
  server: {
    allowedHosts: [
      'localhost',
      '.ngrok-free.app',  // Allow all ngrok-free.app subdomains
      'ff765c92b2d3.ngrok-free.app'  // Specific ngrok host
    ]
  }
})