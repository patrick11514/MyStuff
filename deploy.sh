#!/bin/bash
cp ./init* ~/scripts
cp CreateSvelteApp.sh ~/scripts
cd LIBS
pnpm depl
cd ../CreatePatrick115App
pnpm depl
