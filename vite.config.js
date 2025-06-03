import { defineConfig } from 'vite'

export default defineConfig({
  root: './', // Set the root directory
  publicDir: 'public', // Set the public directory
  server: {
    open: '/landing.html', // Open landing.html by default when starting the dev server
  },
  build: {
    outDir: 'dist', // Output directory for production build
    rollupOptions: {
      input: {
        main: './landing.html', // Set landing.html as the main entry point
        driving: './driving.html', // Include other HTML files
        podium: './podium.html',
      },
    },
  },
}) 