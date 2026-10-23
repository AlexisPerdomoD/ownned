import { defineConfig } from 'vitest/config'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    test: {
        environment: 'node'
    },
    resolve: {
        alias: {
            '@': `${__dirname}/src`,
            '@shared': `${__dirname}/src/shared`
        }
    }
})