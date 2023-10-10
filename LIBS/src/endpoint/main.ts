import FormData from 'form-data'
import nFetch, { type HeadersInit, type RequestInit } from 'node-fetch'
import { z } from 'zod'

type EndpointMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type ErrorSchema = {
    status: false
    error: string
}

export class Endpoint<T> {
    endpoint: string
    method: EndpointMethod
    data: any
    schema: z.ZodType<T>
    headers: HeadersInit | undefined

    constructor(endpoint: string, method: EndpointMethod, data: any, schema: z.ZodType<T>, headers?: HeadersInit) {
        this.endpoint = endpoint
        this.method = method
        this.data = data
        this.schema = schema
        this.headers = headers
    }

    async fetch() {
        return new Promise<T | ErrorSchema>(async (resolve, reject) => {
            const object: RequestInit = {
                method: this.method,
            }

            if (this.headers) {
                object['headers'] = this.headers
            }

            switch (typeof this.data) {
                case 'string':
                    object['body'] = this.data
                    break
                case 'object':
                    if (this.data instanceof FormData) {
                        object['body'] = this.data
                    } else {
                        object['body'] = JSON.stringify(this.data)
                    }
                    break
                default:
                    throw Error('Undefined data type')
            }

            const request = await nFetch(this.endpoint, object)

            let json
            try {
                json = await request.json()
            } catch (e) {
                reject(e)
            }

            const data = this.schema.safeParse(json)

            if (!data.success) {
                const errorSchema: z.ZodType<ErrorSchema> = z.object({
                    status: z.literal(false),
                    error: z.string(),
                })

                const error = errorSchema.safeParse(json)

                if (!error.success) {
                    reject(data.error)
                } else {
                    resolve(error.data)
                }
            } else {
                resolve(data.data)
            }
        })
    }
}
