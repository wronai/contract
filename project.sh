#!/usr/bin/env bash
code2logic ./ -f toon --compact --function-logic --with-schema -o all.project.toon
code2logic ./src -f toon --compact --function-logic --with-schema -o src.project.toon