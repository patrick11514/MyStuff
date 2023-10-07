const fs = require('node:fs')
const packageJson = require('./package.json')
packageJson.main = './CreatePatrick115App.js'
packageJson.scripts = {}
packageJson.devDependencies = {}

fs.writeFileSync('./build/package.json', JSON.stringify(packageJson, null, 4))
fs.renameSync('./build/index.js', './build/CreatePatrick115App.js')
