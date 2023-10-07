#!/bin/bash
cp ./init* ~/scripts
cd LIBS
pnpm depl
cd ../CreatePatrick115App
pnpm depl
