import dotenv from 'dotenv'
import { z } from 'zod'
import { Endpoint } from './endpoint/main'
dotenv.config()
;(async () => {
    const endpoint = new Endpoint(
        'http://localhost:5173/api/login',
        'POST',
        {
            username: 'patrick115',
            password: 'pepa123',
        },
        z.object({
            success: z.literal(true),
            data: z.object({}),
        })
    )

    const data = await endpoint.fetch()
    console.log(data)
})()
