#!/bin/bash
# peek.sh clipdir n -> clipdir/peek.png with n frames spread over the clip
d=$1; n=${2:-6}; dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $d/clip.mp4)
files=(); for i in $(seq 0 $((n-1))); do t=$(python3 -c "print(round($dur*($i+0.5)/$n,2))"); ffmpeg -loglevel error -y -ss $t -i $d/clip.mp4 -frames:v 1 -vf scale=300:-1 $d/p$i.png; files+=($d/p$i.png); done
"$(dirname $0)/sheet.sh" $d/peek.png "${files[@]}"
