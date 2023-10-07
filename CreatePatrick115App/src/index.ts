import clc from 'cli-color'
import enquirer from 'enquirer'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import Path from 'path'

/**
 *  Get current time in format HH:MM:SS:MS
 * @param mills include milliseconds?
 * @returns string
 */
const _getTime = (mills = false) => {
    let date = new Date()

    //HH:MM:SS:MS
    let hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    let minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    let seconds = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()

    let time = `${hours}:${minutes}:${seconds}`

    if (mills) {
        let milliseconds =
            date.getMilliseconds() < 10
                ? `00${date.getMilliseconds()}`
                : date.getMilliseconds() < 100
                ? `0${date.getMilliseconds()}`
                : date.getMilliseconds()
        time += `:${milliseconds}`
    }

    return time
}

/**
 * Write formatted text to console in format [TIME] [INFO/ERROR] text
 * @param type error or text
 * @param text some text
 * @param time prepend time to text?
 */
const _ = (type: 'error' | 'text', text: string, time: boolean = true) => {
    const fnc = type == 'error' ? clc.red : clc.cyan
    const _text = type == 'error' ? 'ERROR' : 'INFO'

    let string = ''

    if (time) {
        string += `${clc.blackBright('[')}${clc.yellow(_getTime(false))}${clc.blackBright(']')} `
    }

    string += `${clc.blackBright('[')}${fnc(_text)}${clc.blackBright(']')} ${clc.white(text)}`

    console.log(string)
}

const argumenents = process.argv.slice(2, process.argv.length)
let packageProgram: 'npm' | 'pnpm' | 'yarn' = 'npm'

const main = async () => {
    _(
        'text',
        `Welcome in ${clc.redBright('Create Patrick115 App')} version ${clc.yellow(process.env.npm_package_version)}`
    )

    let currentPath = process.env.PWD as string

    if (argumenents.length == 0) {
        _('text', 'No arguments passed, using current directory')
    } else {
        _('text', 'Using directory from argument')
        currentPath = argumenents[0]
    }

    const { installationPath } = await enquirer.prompt<{
        installationPath: string
    }>({
        name: 'installationPath',
        message: `Installation folder`,
        type: 'input',
        initial: currentPath,
    })

    if (!fs.existsSync(installationPath)) {
        await _c(`mkdir -p ${installationPath}`)
        _('text', `Created ${clc.cyan(installationPath)}`)
    }

    if (fs.readdirSync(installationPath).length > 0) {
        const { continue: cont } = await enquirer.prompt<{ continue: boolean }>([
            {
                name: 'continue',
                type: 'confirm',
                message: 'Folder is not empty, do you want to continue?',
                initial: false,
            },
        ])

        if (!cont) {
            _('error', 'Program ended by user')
            return
        }
    }

    const { project, name, program } = await enquirer.prompt<{
        project: 'svelte' | 'tsc' | 'discord'
        name: string
        program: 'npm' | 'pnpm' | 'yarn'
    }>([
        {
            name: 'project',
            message: 'What do you want to install?',
            type: 'select',
            choices: [
                {
                    message: 'Svelte App',
                    name: 'svelte',
                },
                {
                    message: 'Typescript Project',
                    name: 'tsc',
                },
                {
                    message: 'Discord Bot',
                    name: 'discord',
                },
            ],
        },
        {
            name: 'program',
            message: 'Which program do you use?',
            type: 'select',
            choices: [
                {
                    message: 'npm',
                    name: 'npm',
                },
                {
                    message: 'pnpm',
                    name: 'pnpm',
                },
                {
                    message: 'yarn',
                    name: 'yarn',
                },
            ],
        },
        {
            name: 'name',
            message: 'Name of project?',
            type: 'input',
            validate(input: string) {
                if (input.length == 0) {
                    return 'Please enter a name'
                }
                if (input.includes('/') || input.includes('\\')) {
                    return 'Use a valid name'
                }

                return true
            },
            result(value: string) {
                return value.toLowerCase().replaceAll(' ', '_')
            },
        },
    ])

    packageProgram = program

    switch (project) {
        case 'svelte':
            createSvelteApp(installationPath, name)
            break
        case 'tsc':
            createTypescriptApp(installationPath, name)
            break
        case 'discord':
            createDiscordBot(installationPath, name)
            break
    }
}

/**
 * Generate package install program
 * @param packages
 * @returns string
 */
const _p = (
    packages:
        | string
        | {
              name: string
              version?: string
              dev?: true
          }[]
): string => {
    let string = packageProgram
    if (packageProgram == 'yarn') {
        string += ' add'
    } else {
        string += ' install'
    }

    if (typeof packages == 'string') {
        return (string += ' ' + packages)
    }

    const normalPackages = packages.filter((p) => {
        return p.dev !== true
    })
    const devPackages = packages.filter((p) => {
        return p.dev === true
    })

    let normalCommand = string

    normalPackages.forEach((pkg) => {
        normalCommand += ` ${pkg.name}` + (pkg.version ? `@${pkg.version}` : '')
    })

    let devCommand = string
    if (packageProgram != 'yarn') {
        devCommand += ' -D'
    }

    devPackages.forEach((pkg) => {
        devCommand += ` ${pkg.name}` + (pkg.version ? `@${pkg.version}` : '')
    })

    if (packageProgram == 'yarn') {
        devCommand += ' -D'
    }

    switch (true) {
        case normalPackages.length > 0 && devPackages.length == 0:
            return normalCommand
        case normalPackages.length == 0 && devPackages.length > 0:
            return devCommand
        case normalPackages.length > 0 && devPackages.length > 0:
            return `${normalCommand}; ${devCommand}`
    }

    return ''
}

/**
 * Execute shell command
 * @param command
 * @returns Promise<true>
 */
const _c = async (command: string, path?: string) => {
    return new Promise<true>((resolve, reject) => {
        exec(`${path ? `cd ${path} && ` : ''}${command}`, (error) => {
            if (error) {
                reject(error)
            } else {
                resolve(true)
            }
        })
    })
}

const createSvelteApp = async (path: string, name: string) => {
    _('text', `You selected: ${clc.red('Svelte Application')}`)

    const { type, checking, features } = await enquirer.prompt<{
        type: 'default' | 'skeleton' | 'skeletonlib'
        checking: 'checkjs' | 'typescript' | 'nulll'
        features: ('eslint' | 'prettier' | 'playwright' | 'vitest')[]
    }>([
        {
            name: 'type',
            type: 'select',
            message: 'Which app do you want to create?',
            choices: [
                {
                    message: 'Demo App',
                    name: 'default',
                    hint: 'Default app with example project',
                },
                {
                    message: 'Skeleton Project',
                    name: 'skeleton',
                    hint: 'Clear skeleton app',
                },
                {
                    message: 'Library Project',
                    name: 'skeletonlib',
                    hint: 'Skeleton app for library',
                },
            ],
        },
        {
            name: 'checking',
            type: 'select',
            message: 'Which type checking do you want to use?',
            choices: [
                {
                    message: 'JS + JSDoc comments',
                    name: 'checkjs',
                },
                {
                    message: 'TypeScript',
                    name: 'typescript',
                },
                {
                    message: 'Nothing',
                    name: 'null',
                },
            ],
        },
        {
            name: 'features',
            type: 'multiselect',
            message: 'Which additional options, do you want to use?',
            choices: [
                {
                    message: 'ESLint',
                    name: 'eslint',
                },
                {
                    message: 'Prettier',
                    name: 'prettier',
                },
                {
                    message: 'Playwright',
                    name: 'playwright',
                },
                {
                    message: 'Vitest',
                    name: 'vitest',
                },
            ],
        },
    ])

    let createCommand = `${packageProgram} create svelte-with-args --name=${name} --directory=./ `
    createCommand += `--template=${type} `
    createCommand += `--types=${checking} `
    createCommand += `--prettier=${features.includes('prettier')} `
    createCommand += `--eslint=${features.includes('eslint')} `
    createCommand += `--playwright=${features.includes('playwright')} `
    createCommand += `--vitest=${features.includes('vitest')}`

    _('text', clc.green('Creating Svelte Project...'))
    await _c(createCommand, path)

    //delete example file
    if (fs.existsSync(Path.join(path, 'src', 'lib', 'index.ts'))) {
        fs.unlinkSync(Path.join(path, 'src', 'lib', 'index.ts'))
    }

    //append to gitignore
    const gitignore = `#lock files
pnpm-lock.yaml
package-lock.json
yarn.lock`

    fs.appendFileSync(Path.join(path, '.gitignore'), gitignore)

    const { tools } = await enquirer.prompt<{ tools: ('tailwindcss' | 'default' | 'authme' | 'cookies' | 'mysql')[] }>({
        name: 'tools',
        type: 'multiselect',
        message: 'Select additional things to install',
        choices: [
            {
                message: 'TailwindCSS',
                name: 'tailwindcss',
            },
            {
                message: 'Default Packages',
                name: 'default',
                hint: 'dotenv, zod',
            },
            {
                message: 'Authme Lib',
                name: 'authme',
                hint: 'Lib for minecraft plugin Authme (pasword compare)',
            },
            {
                message: 'Cookies Lib',
                name: 'cookies',
                hint: 'Library for handling sessions with JWT Token',
            },
            {
                message: 'MySQL Lib',
                name: 'mysql',
                hint: 'MySQL Lib for handling connections',
            },
        ],
    })

    _('text', 'Creating prettier config...')
    if (features.includes('prettier')) {
        fs.writeFileSync(
            Path.join(path, '.prettierrc'),
            `{
    "useTabs": false,
    "tabWidth": 4,
    "singleQuote": true,
    "trailingComma": "none",
    "printWidth": 180,
    "semi": false,
    "plugins": ["prettier-plugin-svelte"${tools.includes('tailwindcss') ? ', "prettier-plugin-tailwindcss"' : ''}],
    "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}`
        )
    }

    let packages: Array<string> = []
    let devPackages: Array<string> = []

    if (!fs.existsSync(Path.join(path, 'src', 'lib', 'server'))) {
        fs.mkdirSync(Path.join(path, 'src', 'lib', 'server'))
    }

    _('text', 'Adding tailwindcss...')
    if (tools.includes('tailwindcss')) {
        devPackages = devPackages.concat(['tailwindcss', 'postcss', 'autoprefixer', 'prettier-plugin-tailwindcss'])

        //tailwind config
        fs.writeFileSync(
            Path.join(path, 'tailwind.config.js'),
            `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {}
  },
  plugins: []
};`
        )
        //postcss config
        fs.writeFileSync(
            Path.join(path, 'postcss.config.js'),
            `export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
}
`
        )

        //css file
        fs.writeFileSync(
            Path.join(path, 'src', 'app.css'),
            `@tailwind base;
@tailwind components;
@tailwind utilities;`
        )

        //layout
        fs.writeFileSync(
            Path.join(path, 'src', 'routes', '+layout.svelte'),
            `<script>
    import "../app.css";
</script>

<slot />`
        )

        //main wile with example TailwindCSS Class
        fs.writeFileSync(
            Path.join(path, 'src', 'routes', '+page.svelte'),
            `<h1>Welcome to SvelteKit</h1>
<p>
    Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
    <span class="text-red-500">text-red-500</span>
</p>`
        )
    }

    _('text', 'Adding default packages...')
    if (tools.includes('default')) {
        packages = packages.concat(['zod', 'dotenv'])
        let env = `#webserver config
HOST=0.0.0.0
PORT=5178
ORIGIN=http://localhost:5178`

        if (tools.includes('mysql')) {
            env += `\n#database config
DATABASE_IP=10.10.10.223
DATABASE_PORT=3306
DATABASE_USER=superclovek
DATABASE_PASSWORD=tajnyheslo123456`
        }

        if (tools.includes('cookies')) {
            env += `\n#secret pro JWT (tím se bude podepisovat JWT token - https://jwt.io/)
JWT_SECRET=text
#v sekundách (10 min =  10 * 60)
#expiruje pouze pokud uživatel danou dobu nic nedělá (neprochází stránky)
COOKIE_EXPIRE=1200
#v sekundách (5 minut = 5 * 60)
PUBLIC_CHECK_COOKIE_INTERVAL=300`
        }

        fs.writeFileSync(Path.join(path, '.env.example'), env)

        //global functions
        fs.writeFileSync(
            Path.join(path, 'src', 'lib', 'functions.ts'),
            `export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}`
        )

        //server functions
        fs.writeFileSync(
            Path.join(path, 'src', 'lib', 'server', 'functions.ts'),
            `import { json } from '@sveltejs/kit'
import type { z } from 'zod'

export const checkData = async <T>(request: Request, obj: z.ZodType<T>): Promise<Response | z.infer<typeof obj>> => {
    let data

    try {
        data = await request.json()
    } catch (_) {
        return json({
            status: false,
            error: 'Invalid data'
        })
    }

    const resp = obj.safeParse(data)

    if (resp.success) {
        return resp.data
    }

    return json({
        status: false,
        error: resp.error
    })
}

export const isOk = (data: Response | unknown): data is Response => {
    return data instanceof Response
}`
        )
    }

    _('text', 'Adding authme...')
    if (tools.includes('authme')) {
        packages.push('bcrypt')
        devPackages.push('@types/bcrypt')

        const request = await fetch(
            'https://raw.githubusercontent.com/patrick11514/MyStuff/main/LIBS/src/authme/main.ts'
        )
        const data = await request.text()
        const serverPath = Path.join(path, 'src', 'lib', 'server')
        if (!fs.existsSync(Path.join(serverPath, 'authme'))) {
            fs.mkdirSync(Path.join(serverPath, 'authme'))
        }
        fs.writeFileSync(Path.join(serverPath, 'authme', 'main.ts'), data)
    }

    _('text', 'Adding cookies...')
    if (tools.includes('cookies')) {
        packages = packages.concat(['async-lz-string', 'jsonwebtoken', 'simple-json-db', 'uuid'])
        devPackages = devPackages.concat(['@types/uuid', '@types/jsonwebtoken'])

        const request = await fetch(
            'https://raw.githubusercontent.com/patrick11514/MyStuff/main/LIBS/src/cookies/main.ts'
        )
        const data = await request.text()
        const serverPath = Path.join(path, 'src', 'lib', 'server')
        if (!fs.existsSync(Path.join(serverPath, 'cookies'))) {
            fs.mkdirSync(Path.join(serverPath, 'cookies'))
        }
        fs.writeFileSync(Path.join(serverPath, 'cookies', 'main.ts'), data)

        fs.appendFileSync(
            Path.join(serverPath, 'variables.ts'),
            `import { JWT_SECRET} from '$env/static/private'
import { JWTCookies } from './cookies/main'
export const jwt = new JWTCookies(JWT_SECRET)\n`
        )
    }

    _('text', 'Adding mysql...')
    if (tools.includes('mysql')) {
        packages.push('mariadb')

        const request = await fetch(
            'https://raw.githubusercontent.com/patrick11514/MyStuff/main/LIBS/src/mysql/main.ts'
        )
        const data = await request.text()
        const serverPath = Path.join(path, 'src', 'lib', 'server')
        if (!fs.existsSync(Path.join(serverPath, 'mysql'))) {
            fs.mkdirSync(Path.join(serverPath, 'mysql'))
        }
        fs.writeFileSync(Path.join(serverPath, 'mysql', 'main.ts'), data)

        fs.appendFileSync(
            Path.join(serverPath, 'variables.ts'),
            `import {
    DATABASE_IP,
    DATABASE_PASSWORD,
    DATABASE_PORT,
    DATABASE_USER
} from '$env/static/private';
import { MySQL } from './mysql/main';

export const conn = new MySQL({
    host: DATABASE_IP,
    port: parseInt(DATABASE_PORT),
    user: DATABASE_USER,
    password: DATABASE_PASSWORD
});

conn.connect();\n`
        )
    }

    //edit package.json
    const data = fs.readFileSync(Path.join(path, 'package.json'))
    const packageJson = JSON.parse(data.toString()) as {
        name: string
        version: string
        private: boolean
        scripts: Record<string, string>
        devDependencies: Record<string, string>
        dependencies: Record<string, string>
        type: 'module' | 'commonjs'
    }

    _('text', 'Adding tailwindcss...')
    if (tools.includes('tailwindcss')) {
        packageJson.scripts.lint =
            'prettier --plugin prettier-plugin-svelte --plugin prettier-plugin-tailwindcss --check .'
        if (features.includes('eslint')) {
            packageJson.scripts.lint += ' && eslint .'
        }

        packageJson.scripts.format =
            'prettier --plugin prettier-plugin-svelte --plugin prettier-plugin-tailwindcss --write .'
    } else {
        packageJson.scripts.lint = 'prettier --plugin prettier-plugin-svelte --check .'
        if (features.includes('eslint')) {
            packageJson.scripts.lint += ' && eslint .'
        }

        packageJson.scripts.format = 'prettier --plugin prettier-plugin-svelte --write .'
    }

    const { adapter } = await enquirer.prompt<{
        adapter: 'cloudflare' | 'cloudflare-workers' | 'netlify' | 'node' | 'static' | 'vercel'
    }>({
        name: 'adapter',
        type: 'select',
        message: 'Select Svelte Adapter to use',
        choices: [
            {
                message: 'Cloudflare',
                name: 'cloudflare',
                hint: 'for Cloudflare pages',
            },
            {
                message: 'Cloudflare Workers',
                name: 'cloudflare-workers',
                hint: 'for Clouflare Workers',
            },
            {
                message: 'Netlify',
                name: 'netlify',
                hint: 'for Netlify',
            },
            {
                message: ' Node',
                name: 'node',
                hint: 'for Node servers',
            },
            {
                message: 'Static',
                name: 'static',
                hint: 'for static site generation (SSG)',
            },
            {
                message: 'Vercel',
                name: 'vercel',
                hint: 'for Vercel',
            },
        ],
    })

    devPackages.push(`@sveltejs/adapter-${adapter}`)

    if (adapter == 'node') {
        //for node adapter
        if (tools.includes('default')) {
            packageJson.scripts.start = 'node -r dotenv/config build'
        } else {
            packageJson.scripts.start = 'node build'
        }
    }

    //write package.json
    fs.writeFileSync(Path.join(path, 'package.json'), JSON.stringify(packageJson, null, 4))

    //create readme
    fs.writeFileSync(
        Path.join(path, 'README.md'),
        `# Info
...

## Dev mode

\`\`\`bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
\`\`\`

## Build

Building app:

\`\`\`bash
npm run build
\`\`\`

Show builded preview: \`npm run preview\`.
${
    adapter == 'node'
        ? 'Start builded app using `npm run start` with [Node Adapter](https://kit.svelte.dev/docs/adapter-node) or config command in package.json using your own [Adapter](https://kit.svelte.dev/docs/adapters)'
        : ''
} 

## Example ENV file (.env.example)

\`\`\`YAML
${fs.readFileSync(Path.join(path, '.env.example'))}
\`\`\``
    )

    _('text', 'Installing packages...')
    const arr = packages
        .map((p) => {
            return {
                name: p,
            }
        })
        .concat(
            devPackages.map((p) => {
                return {
                    name: p,
                    dev: true,
                }
            })
        )

    //remove default adapter
    await _c(`${packageProgram} remove @sveltejs/adapter-auto`, path)

    //update adapter in svelte.config.js
    const svelteJS = fs.readFileSync(Path.join(path, 'svelte.config.js'))
    fs.writeFileSync(
        Path.join(path, 'svelte.config.js'),
        svelteJS.toString().replace(/@sveltejs\/adapter-auto/g, `@sveltejs/adapter-${adapter}`)
    )

    await _c(_p(arr), path)

    _('text', 'Updating packages...')
    if (packageProgram == 'yarn') {
        await _c(`${packageProgram} upgrade`, path)
    } else {
        await _c(`${packageProgram} update -L`, path)
    }

    _('text', 'Formatting...')
    await _c(`${packageProgram} format`, path)

    const { git } = await enquirer.prompt<{ git: boolean }>({
        name: 'git',
        type: 'confirm',
        message: 'Do you want to initialize git?',
    })

    if (git) {
        await _c('git init', path)
        await _c('git add .', path)
        await _c("git commit -m 'Initial commit'", path)
    }

    _('text', clc.green('Instalation complete'))
    _('text', `Now you can use cd ${path} && ${packageProgram} dev to start developing`)
}

const createTypescriptApp = async (path: string, name: string) => {
    _('text', `You selected: ${clc.red('Typescript Application')}`)

    const { extensions, dependencies } = await enquirer.prompt<{
        extensions: boolean
        dependencies: ('simple-json-db' | 'mariadb' | 'node-fetch' | 'express' | 'prettier' | 'dotenv' | 'zod')[]
    }>([
        {
            name: 'extensions',
            type: 'confirm',
            message: 'Do you want to install message logger, which uses CLI Colors?',
        },
        {
            name: 'dependencies',
            type: 'multiselect',
            message: 'Which demendencies do you want to install?',
            choices: [
                {
                    message: 'Simple Json DB',
                    name: 'simple-json-db',
                },
                {
                    message: 'MySQL',
                    name: 'mariadb',
                },
                {
                    message: 'Fetch',
                    name: 'node-fetch',
                },
                {
                    message: 'Express JS',
                    name: 'express',
                },
                {
                    message: 'Prettier',
                    name: 'prettier',
                },
                {
                    message: 'DotEnv',
                    name: 'dotenv',
                },
                {
                    message: 'Zod',
                    name: 'zod',
                },
            ],
        },
    ])

    let olderNodeFetch = false

    if (dependencies.includes('node-fetch')) {
        const { olderNodeFetch: node } = await enquirer.prompt<{ olderNodeFetch: boolean }>({
            name: 'olderNodeFetch',
            type: 'confirm',
            message: 'Do you want to use CommonJS version of node-fetch?',
        })

        olderNodeFetch = node
    }

    let packages: Array<string> = []
    let devPackages: Array<string> = ['ts-node-dev', 'typescript', '@types/node']

    _('text', 'Adding default packages...')
    if (extensions) {
        packages = packages.concat(['cli-color', 'strip-color'])
        devPackages = devPackages.concat(['@types/cli-color', '@types/strip-color'])

        const libPath = Path.join(path, 'src', 'lib')

        if (!fs.existsSync(libPath)) {
            fs.mkdirSync(libPath, {
                recursive: true,
            })
        }

        if (!fs.existsSync(Path.join(path, 'logs'))) {
            fs.mkdirSync(Path.join(path, 'logs'))
        }

        const request = await fetch('https://upload.patrick115.eu/.storage/logger.ts')
        const data = await request.text()

        fs.writeFileSync(Path.join(libPath, 'logger.ts'), data)
    }

    _('text', 'Adding dependencies...')
    if (dependencies.includes('simple-json-db')) {
        packages.push('simple-json-db')
    }

    if (dependencies.includes('mariadb')) {
        packages.push('mariadb')
    }

    if (dependencies.includes('node-fetch')) {
        if (olderNodeFetch) {
            packages.push('node-fetch')
        } else {
            packages.push('node-fetch@2')
        }
    }

    if (dependencies.includes('express')) {
        packages.push('express')
    }

    if (dependencies.includes('dotenv')) {
        packages.push('dotenv')
    }

    if (dependencies.includes('prettier')) {
        devPackages.push('prettier')

        //prettier config
        fs.writeFileSync(
            Path.join(path, '.prettierrc'),
            `{
    "printWidth": 120,
    "semi": false,
    "singleQuote": true,
    "useTabs": false,
    "tabWidth": 4
}`
        )
    }

    if (dependencies.includes('zod')) {
        packages.push('zod')
    }

    //create package.json
    await _c(`${packageProgram} init ${packageProgram != 'pnpm' ? '-y' : ''}`, path)

    //edit package.json
    const data = fs.readFileSync(Path.join(path, 'package.json'))
    const packageJson = JSON.parse(data.toString()) as {
        name: string
        version: string
        private: boolean
        scripts: Record<string, string>
        devDependencies: Record<string, string>
        dependencies: Record<string, string>
        type: 'module' | 'commonjs'
    }

    packageJson.name = name
    packageJson.scripts.dev = 'ts-node-dev --respawn ./src/index.ts'
    packageJson.scripts.build = 'mkdir -p build && tsc'
    packageJson.scripts.start = 'node ./build/index.js'
    packageJson.scripts.clear = 'rm -rf build'

    if (dependencies.includes('prettier')) {
        packageJson.scripts.format = 'prettier --write .'
    }

    fs.writeFileSync(Path.join(path, 'package.json'), JSON.stringify(packageJson, null, 4))

    fs.writeFileSync(
        Path.join(path, '.gitignore'),
        `node_modules
build
.env
.env.*
!.env.example
#lock files
pnpm-lock.yaml
package-lock.json
yarn.lock`
    )

    if (dependencies.includes('dotenv')) {
        const typesFolder = Path.join(path, 'src', 'types')

        if (!fs.existsSync(typesFolder)) {
            fs.mkdirSync(typesFolder, {
                recursive: true,
            })
        }

        fs.writeFileSync(
            Path.join(typesFolder, 'env.d.ts'),
            `declare global {
    namespace NodeJS {
        interface ProcessEnv {
        }
    }
}
export {}`
        )
    }

    fs.writeFileSync(
        Path.join(path, 'tsconfig.json'),
        `{
    "compilerOptions": {
        "rootDir": "src",
        "outDir": "build",
        "removeComments": true,
        "target": "ES2022",
        "module": "CommonJS",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
    },
    "include": [
        "src/**/*"
    ],
    "exclude": [
        "node_modules",
    ]
}`
    )

    const pkgs = packages
        .map((p) => {
            if (p.includes('@')) {
                const s = p.split('@')
                return {
                    name: s[0],
                    version: s[1],
                }
            }
            return {
                name: p,
            }
        })
        .concat(
            devPackages.map((p) => {
                return {
                    name: p,
                    dev: true,
                }
            })
        )

    _('text', 'Installing packages...')
    await _c(_p(pkgs), path)
    if (dependencies.includes('prettier')) {
        await _c(`${packageProgram} format`, path)
    }

    const { git } = await enquirer.prompt<{ git: boolean }>({
        name: 'git',
        type: 'confirm',
        message: 'Do you want to initialize git?',
    })

    if (git) {
        await _c('git init')
        await _c('git add .')
        await _c("git commit -m 'Initial commit'")
    }

    _('text', clc.green('Instalation complete'))
    _('text', `Now you can use cd ${path} && ${packageProgram} dev to start developing`)
}

const createDiscordBot = async (path: string, name: string) => {
    _('text', `You selected: ${clc.red('Discord Bot')}`)
}

;(async () => {
    try {
        await main()
        //handle CTRL + C
    } catch (_) {}
})()
