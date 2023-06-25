import dotenv from 'dotenv'
import { MySQL } from './mysql/main'
dotenv.config()
;(async () => {
    const conn = new MySQL(
        {
            host: process.env.DATABASE_IP,
            port: parseInt(process.env.DATABASE_PORT as string),
            user: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_DATABASE,
        },
        true
    )

    conn.connect()

    const table = process.env.DATABASE_TABLE
})()
