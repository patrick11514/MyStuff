#!/bin/bash
cp ./init* ~/scripts
cp CreateSvelteApp.sh ~/scripts
cd LIBS
pnpm depl
