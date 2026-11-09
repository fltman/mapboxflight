import { defineConfig } from 'vite';

// Unusual port to avoid clashing with other local dev servers (3000, 5173, 8080 …).
// Override with PORT=xxxx ./start.sh or PORT=xxxx npm run dev.
const port = Number(process.env.PORT) || 47613;

export default defineConfig({
  server: {
    port,
    strictPort: true, // fail loudly instead of silently picking another port
    open: true,
  },
  preview: {
    port,
    strictPort: true,
    open: true,
  },
});
