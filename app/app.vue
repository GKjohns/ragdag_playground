<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'RAGDAG Playground'
const description = 'An interactive playground for exploring LLM-powered DAG execution and document analysis'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="p-1.5 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg">
            <UIcon name="i-heroicons-beaker" class="w-5 h-5 text-white" />
          </div>
          <span class="text-lg font-semibold">RAGDAG Playground</span>
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          to="https://github.com"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4" />
          <span>RAGDAG Framework • © {{ new Date().getFullYear() }}</span>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>Built with RAGDAG Framework</span>
        </div>
      </template>
    </UFooter>
  </UApp>
</template>
