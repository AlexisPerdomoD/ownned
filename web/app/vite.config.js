import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [solid(), tailwindcss()],
    resolve: {
        alias: {
            '@': `${import.meta.url}/src/`,
            '@entities': `${import.meta.url}/src/entities/`,
            '@features': `${import.meta.url}/src/features/`,
            '@pages': `${import.meta.url}/src/pages/`,
            '@shared': `${import.meta.url}/src/shared/`
        }
    }
})
