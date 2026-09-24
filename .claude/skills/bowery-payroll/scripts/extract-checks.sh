#!/bin/bash
# Pull every Net Pay Report in a payroll folder into one text file per pay run.
#
#   extract-checks.sh <folder> <out dir>
#
# Reads both shapes ADP arrives in: the reports zip per entity, and a loose
# "<Store> [Hourly|Salary] Net Pay Report ....pdf" saved out of one.
#
# Writes <out dir>/<client id>-<hourly|salary>.txt. An entity with no Net Pay
# Report ran no live checks, and no file is written for it.
#
# pdftotext -table is the only mode that keeps a check number beside its own
# amount; -layout shifts the amount column down a row on these reports and
# silently pairs every check with its neighbour's figure.
set -u
SRC="$1"; OUT="$2"
mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
shopt -s nullglob

# The report names its own client in the header, which beats the file name:
#   CLIENT  154922 31 GREAT JONES RESTAURANT CORP - 31 GREAT JONES RESTAU_01
# A salary run carries SALARY in the sub-company after the dash; an hourly one
# ends _01. The file name wins when it says which, since it is the one thing a
# human set deliberately.
place() {
  local pdf="$1" hint="$2" txt id sub kind
  txt="$TMP/out.txt"
  pdftotext -table "$pdf" "$txt" 2>/dev/null || { echo "UNREADABLE $(basename "$pdf")"; return; }
  id=$(grep -oE 'CLIENT +[0-9]{6}' "$txt" | head -1 | grep -oE '[0-9]{6}')
  [ -n "$id" ] || { echo "NO CLIENT ID $(basename "$pdf")"; return; }
  sub=$(grep -oE 'CLIENT +[0-9]{6}.*' "$txt" | head -1 | sed 's/.* - //')
  case "$hint" in
    hourly|salary) kind="$hint" ;;
    *) case "$sub" in *SALARY*|*Salary*) kind=salary ;; *) kind=hourly ;; esac ;;
  esac
  if [ -f "$OUT/$id-$kind.txt" ]; then echo "DUPLICATE $id-$kind from $(basename "$pdf")"; return; fi
  cp "$txt" "$OUT/$id-$kind.txt"
  echo "checks    $id-$kind  $(basename "$pdf")"
}

for z in "$SRC"/*-reports.zip; do
  b=$(basename "$z")
  hint=none
  case "$b" in *Salary*) hint=salary ;; *Hourly*) hint=hourly ;; esac
  rm -rf "$TMP/x"; mkdir -p "$TMP/x"
  unzip -o -q "$z" -d "$TMP/x" 'Net Pay Report*.pdf' 2>/dev/null
  f=$(ls "$TMP/x"/*.pdf 2>/dev/null | head -1)
  if [ -n "$f" ]; then place "$f" "$hint"; else echo "no checks $b"; fi
done

for p in "$SRC"/*"Net Pay Report"*.pdf; do
  b=$(basename "$p")
  hint=none
  case "$b" in *Salary*) hint=salary ;; *Hourly*) hint=hourly ;; esac
  place "$p" "$hint"
done

ls "$OUT" >/dev/null 2>&1 && echo "-- $(ls "$OUT" | wc -l) pay runs with live checks"
