#!/bin/bash
# sheet.sh out.png in1.png in2.png ... -> side by side at 360px wide each
out=$1; shift; args=(); f=""; i=0
for x in "$@"; do args+=(-i "$x"); f+="[$i:v]scale=300:-1[v$i];"; i=$((i+1)); done
s=""; for j in $(seq 0 $((i-1))); do s+="[v$j]"; done
ffmpeg -loglevel error -y "${args[@]}" -filter_complex "${f}${s}hstack=inputs=$i" "$out"
