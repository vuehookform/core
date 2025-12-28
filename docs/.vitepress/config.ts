import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Vue Hook Form',
  titleTemplate: ':title - Vue Hook Form',
  description:
    'Type-safe, performant form library for Vue 3 with Zod validation. Build forms with minimal boilerplate and perfect TypeScript inference.',

  base: '/',

  sitemap: {
    hostname: 'https://vuehookform.com',
  },

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    ['meta', { name: 'theme-color', content: '#42b883' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          'vue, vue 3, forms, typescript, zod, validation, form library, type-safe, react hook form, vue forms',
      },
    ],
  ],

  transformPageData(pageData) {
    const canonicalUrl = `https://vuehookform.com/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '.html')

    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(['link', { rel: 'canonical', href: canonicalUrl }])
  },

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/vuehookform/core' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@vuehookform/core' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
        {
          text: 'Essentials',
          items: [
            { text: 'Form Setup', link: '/guide/essentials/form-setup' },
            { text: 'Validation', link: '/guide/essentials/validation' },
            { text: 'Error Handling', link: '/guide/essentials/error-handling' },
            { text: 'Form State', link: '/guide/essentials/form-state' },
            { text: 'Submission', link: '/guide/essentials/submission' },
          ],
        },
        {
          text: 'Working with Inputs',
          items: [
            { text: 'Controlled Inputs', link: '/guide/components/controlled-inputs' },
            { text: 'Uncontrolled Inputs', link: '/guide/components/uncontrolled-inputs' },
            { text: 'Custom Components', link: '/guide/components/custom-components' },
          ],
        },
        {
          text: 'Dynamic Forms',
          items: [
            { text: 'Field Arrays', link: '/guide/dynamic/field-arrays' },
            { text: 'Conditional Fields', link: '/guide/dynamic/conditional-fields' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Form Context', link: '/guide/advanced/form-context' },
            { text: 'Watch', link: '/guide/advanced/watch' },
            { text: 'Programmatic Control', link: '/guide/advanced/programmatic-control' },
            { text: 'Async Patterns', link: '/guide/advanced/async-patterns' },
            { text: 'TypeScript', link: '/guide/advanced/typescript' },
          ],
        },
        {
          text: 'Best Practices',
          items: [
            { text: 'Performance', link: '/guide/best-practices/performance' },
            { text: 'Patterns', link: '/guide/best-practices/patterns' },
          ],
        },
        {
          text: 'Help',
          items: [{ text: 'Troubleshooting', link: '/guide/troubleshooting' }],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'useForm', link: '/api/use-form' },
            { text: 'useController', link: '/api/use-controller' },
            { text: 'useFormState', link: '/api/use-form-state' },
            { text: 'useWatch', link: '/api/use-watch' },
            { text: 'Form Context', link: '/api/form-context' },
            { text: 'Types', link: '/api/types' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/vuehookform/core' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present Vue Hook Form',
    },

    search: {
      provider: 'local',
    },
  },
})
