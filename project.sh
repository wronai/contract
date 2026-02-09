#!/usr/bin/env bash
code2logic ./ -f toon --compact --function-logic --with-schema -o project.toon
code2logic ./src -f toon --compact --function-logic --with-schema -o src/project.toon