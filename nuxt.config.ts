// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'app/',
  
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/mdc'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // Runtime config for environment variables
  runtimeConfig: {
    // Private keys that are only available on the server
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    
    // Public keys that are exposed to the client
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
  },

  nitro: {
    experimental: {
      // Enable WebSocket support if needed
      websocket: false
    }
  }
})