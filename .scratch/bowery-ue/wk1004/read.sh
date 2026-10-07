#!/bin/bash
playwright-cli -s=$1 eval "$(cat read.js)" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed '1d;$d'
