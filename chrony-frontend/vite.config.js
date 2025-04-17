import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy:{
      // anything in frontend that interacts with '/api/*' path Is forwarded to http://localhost:3000 ( backend server - local )
      '/api': 'http://localhost:3000' 
    }
  }
  
})


