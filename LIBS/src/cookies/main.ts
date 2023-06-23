import { compressToBase64, decompressFromBase64 } from 'async-lz-string'
import jwt from 'jsonwebtoken'
import path from 'path'
import JSONdb from 'simple-json-db'
import { v4 as uuid } from 'uuid'

/**
 * @author patrick115 (Patrik Mintěl)
 * @license MIT
 * @version 1.2.0
 * @description Cookie lib
 * @homepage https://patrick115.eu
 */

interface cookie<Type> {
    expires: number
    values: Type
}

export class SessionCookies {
    private db: JSONdb<cookie<unknown>>

    constructor(storage = './cookies.json') {
        this.db = new JSONdb<cookie<unknown>>(
            storage.startsWith('./') || storage.startsWith('../') ? path.join(__dirname, storage) : storage,
            {
                syncOnWrite: true,
                jsonSpaces: false,
                asyncWrite: false,
            }
        )
    }

    checkCookies() {
        const cookies = Object.entries(this.db.JSON())
        cookies.forEach(([key, value]) => {
            if (value.expires < Date.now()) {
                this.db.delete(key)
            }
        })
    }

    getCookie<T>(key: string) {
        this.checkCookies()
        return this.db.get(key) as cookie<T>
    }

    updateCookie<T>(id: string, value: T, age: number) {
        this.checkCookies()

        this.db.set(id, {
            expires: Date.now() + age,
            values: value,
        })

        return id
    }

    setCookie<T>(value: T, age: number) {
        this.checkCookies()

        let id = uuid()

        while (this.db.has(id)) {
            id = uuid()
        }

        this.db.set(id, {
            expires: Date.now() + age,
            values: value,
        })

        return id
    }

    deleteCookie(key: string) {
        this.checkCookies()
        this.db.delete(key)
    }
}

export class JWTCookies {
    private key: string
    private compress: boolean

    constructor(key: string, compress: boolean = false) {
        this.key = key
        this.compress = compress
    }

    async setCookie(value: object | string | Buffer): Promise<string> {
        let cookie = jwt.sign(value, this.key)

        if (this.compress) {
            cookie = await compressToBase64(cookie)

            //remove all = from the end of the string
            while (cookie.endsWith('=')) {
                cookie = cookie.slice(0, -1)
            }
        }
        return cookie
    }

    async getCookie<T>(token: string): Promise<T | null> {
        try {
            if (this.compress) {
                token = await decompressFromBase64(token)
            }

            return jwt.verify(token, this.key) as T
        } catch (e) {
            console.error(e)
            return null
        }
    }
}
