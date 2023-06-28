#!/bin/bash
cp ./init* ~
cp CreateSvelteApp.sh ~
cd LIBS
pnpm depl
