#!/bin/bash
FOLDER=$(pwd)
#if parameter is set
if [ -n "$1" ]; then
    #pwd + parameter
    FOLDER=$FOLDER/$1
fi

#check if folder does not exist
if [ ! -d "$FOLDER" ]; then
    #create folder
    mkdir $FOLDER
else
    #check if folder is empty
    if [ "$(ls -A $FOLDER)" ]; then
        #folder is not empty
        echo "Folder is not empty"
        echo "Do you want to continue?"
        select yn in "Yes" "No"; do
            case $yn in
                Yes ) break;;
                No ) exit;;
            esac
        done
    fi
fi

echo "Creating Svelte App in $FOLDER"

#check if pnpm is installed
if ! command -v pnpm &> /dev/null
then
    COMMAND="npm"
else
    COMMAND="pnpm"
fi

echo "Using $COMMAND"

cd $FOLDER

#check if svelte is not installed by existing file svelte.config.js
if [ ! -f "svelte.config.js" ]; then
    #svelte is not installed
    echo "Svelte is not installed"
    echo "Installing"
    $COMMAND create svelte@latest ./
fi

#execute command
$COMMAND install

#tailwind
#yes option with more lines
echo "Do you want to add TailwindCSS?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) 
            $COMMAND install -D tailwindcss postcss autoprefixer
            npx tailwindcss init -p
            CONFIGFILE=$(cat <<EOF
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {}
  },
  plugins: []
};
EOF
)
            echo "$CONFIGFILE" > tailwind.config.js

            CSSFILE=$(cat <<EOF
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF
)
            echo "$CSSFILE" > src/app.css

            LAYOUT=$(cat <<EOF
<script>
  import "../app.css";
</script>

<slot />
EOF
)
            echo "$LAYOUT" > src/routes/+layout.svelte

            MAIN_FILE=$(cat <<EOF
<h1>Welcome to SvelteKit</h1>
<p>
    Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
    <span class="text-red-500">text-red-500</span>
</p>
EOF
)
            echo "$MAIN_FILE" > src/routes/+page.svelte
            break;;
        No ) break;;
    esac
done

#default install
echo "Do you want to install default packages?"

select yn in "Yes" "No"; do
    case $yn in
        Yes ) 
            $COMMAND i dotenv mariadb fs bcrypt uuid jsonwebtoken zod sweetalert2 path simple-json-db
            $COMMAND i -D @sveltejs/adapter-node @types/bcrypt @types/uuid @types/jsonwebtoken

            #add scripts
            SVELTECONFIG=$(cat <<EOF
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/kit/vite'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://kit.svelte.dev/docs/integrations#preprocessors
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
        // If your environment is not supported or you settled on a specific environment, switch out the adapter.
        // See https://kit.svelte.dev/docs/adapters for more information about adapters.
        adapter: adapter(),
        alias: {
            '\$types/*': 'src/types/*',
            '\$components/*': 'src/components/*'
        }
    },
}

export default config
EOF
)
            echo "$SVELTECONFIG" > svelte.config.js

            #add .env
            ENV=$(cat <<EOF
#webserver config
HOST=0.0.0.0
PORT=5178
ORIGIN=http://localhost:5178
#database config
DATABASE_IP=10.10.10.223
DATABASE_PORT=3306
DATABASE_USER=superclovek
DATABASE_PASSWORD=tajnyheslo123456
#secret pro JWT (tím se bude podepisovat JWT token - https://jwt.io/)
JWT_SECRET=text
#v sekundách (10 min =  10 * 60)
#expiruje pouze pokud uživatel danou dobu nic nedělá (neprochází stránky)
COOKIE_EXPIRE=1200
#v sekundách (5 minut = 5 * 60)
PUBLIC_CHECK_COOKIE_INTERVAL=300
EOF
)
            echo "$ENV" > .env

            #README
            README=$(cat <<EOF
 # Info
...

## Dev mód

\`\`\`bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
\`\`\`

## Build

Buildnutí appky:

\`\`\`bash
npm run build
\`\`\`

Zobrazení náhledu build verze: \`npm run preview\`.

Spuštění buildnuté aplikace \`npm run start\` s [Node Adaptérem](https://kit.svelte.dev/docs/adapter-node) nebo s použitím svého [Adaptéru](https://kit.svelte.dev/docs/adapters)

## Ukázkový ENV file

\`\`\`YAML
$ENV
\`\`\`
EOF
)
            echo "$README" > README.md

            mkdir -p src/lib/server

            #variables
            VARIABLES_FILE=$(cat <<EOF
import {
	DATABASE_IP,
	DATABASE_PASSWORD,
	DATABASE_PORT,
	DATABASE_USER
} from '\$env/static/private';
import { MySQL } from './mysql/main';

export const conn = new MySQL({
	host: DATABASE_IP,
	port: parseInt(DATABASE_PORT),
	user: DATABASE_USER,
	password: DATABASE_PASSWORD
});

conn.connect();
EOF
)

            echo "$VARIABLES_FILE" > src/lib/server/variables.ts

            #functions
            FUNCTIONS_FILE=$(cat <<EOF
export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
EOF
)
            echo "$FUNCTIONS_FILE" > src/lib/functions.ts
    
            break;;
        No ) break;;
    esac
done

#authme lib
echo "Do you want to install authme lib?"

select yn in "Yes" "No"; do
    case $yn in
        Yes ) 
            mkdir -p src/lib/server
            cp -r ~/LIBS/authme src/lib/server
            break;;
        No ) break;;
    esac
done

#cookies lib
echo "Do you want to install cookies lib?"

select yn in "Yes" "No"; do
    case $yn in
        Yes ) 
            mkdir -p src/lib/server
            cp -r ~/LIBS/cookies src/lib/server

            echo "import { JWT_SECRET } from \"\$env/static/private\"" >> src/lib/server/variables.ts
            echo "import { JWTCookies } from './cookies/main';" >> src/lib/server/variables.ts
            echo "export const jwt = new JWTCookies(JWT_SECRET)" >> src/lib/server/variables.ts
            break;;
        No ) break;;
    esac
done

#mysql lib
echo "Do you want to install mysql lib?"

select yn in "Yes" "No"; do
    case $yn in
        Yes ) 
            mkdir -p src/lib/server
            cp -r ~/LIBS/mysql src/lib/server
            break;;
        No ) break;;
    esac
done

#git
echo "Do you want to initialize git?"

select yn in "Yes" "No"; do
    case $yn in
        Yes ) 
            git init
            git add .
            git commit -m "Initial commit"
            break;;
        No ) break;;
    esac
done

echo "Installation finished"