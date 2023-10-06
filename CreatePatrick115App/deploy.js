const fs = require("node:fs")
const packageJson = require("./package.json")
packageJson.main = "./CreateSvelteApp.js"
packageJson.scripts = {}
packageJson.devDependencies = {}

fs.writeFileSync("./build/package.json", JSON.stringify(packageJson, null, 4))
fs.renameSync("./build/index.js", "./build/CreateSvelteApp.js")