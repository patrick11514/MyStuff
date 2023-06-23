declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DATABASE_IP: string
            DATABASE_PORT: string
            DATABASE_USER: string
            DATABASE_PASSWORD: string
            DATABASE_DATABASE: string
            DATABASE_TABLE: string
        }
    }
}
export {}
