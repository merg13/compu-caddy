import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/compu-caddy/app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        id: "/compu-caddy/app",
        name: "Compu-Caddy - Golf Stats Tracker",
        short_name: "Compu-Caddy",
        description: "Professional golf statistics tracking and analytics PWA with offline support",
        icons: [
          {
            src: "favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon"
          },
          {
            src: "logo192.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any maskable"
          },
          {
            src: "logo512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any maskable"
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png"
          }
        ],
        screenshots: [
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "logo192.png",
            sizes: "192x192",
            type: "image/png",
            form_factor: "narrow"
          }
        ],
        start_url: "/compu-caddy/app/",
        display: "standalone",
        theme_color: "#10b981",
        background_color: "#ffffff",
        orientation: "any",
        categories: ["sports", "productivity", "utilities"],
        lang: "en-US",
        dir: "ltr",
        scope: "/compu-caddy/app",
        prefer_related_applications: false,
        launch_handler: {
          client_mode: "focus-existing"
        },
        shortcuts: [
          {
            name: "New Round",
            short_name: "New Round",
            description: "Start tracking a new golf round",
            url: "/?action=new-round",
            icons: [
              {
                src: "logo192.png",
                sizes: "192x192"
              }
            ]
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View your golf statistics",
            url: "/?action=dashboard",
            icons: [
              {
                src: "logo192.png",
                sizes: "192x192"
              }
            ]
          }
        ],
        share_target: {
          action: "/",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url"
          }
        },
        file_handlers: [
          {
            action: "/",
            accept: {
              "application/json": [".json"]
            }
          }
        ],
        protocol_handlers: [
          {
            protocol: "web+golf",
            url: "/?action=%s"
          }
        ],
        iarc_rating_id: "e10+",
        widgets: [],
        edge_side_panel: {
          preferred_width: 400
        },
        display_override: ["window-controls-overlay", "tabbed"],
        note_taking: {
          new_note_url: "/?action=new-round"
        }
      }
    })
  ],
})