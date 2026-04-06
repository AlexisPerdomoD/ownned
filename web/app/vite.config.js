import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
    plugins: [solid(), tailwindcss()],
    resolve: {
        alias: {
            '@': `${__dirname}/src`,
            '@entities': `${__dirname}/src/entities`,
            '@features': `${__dirname}/src/features`,
            '@pages': `${__dirname}/src/pages`,
            '@shared': `${__dirname}/src/shared`
        }
    }
})
