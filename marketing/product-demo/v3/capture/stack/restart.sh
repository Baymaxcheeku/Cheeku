#!/bin/bash
cd "$(dirname "$0")"
[ -f server.pid ] && kill $(cat server.pid) 2>/dev/null
for p in $(pgrep -f "^node server.js"); do [ "$p" != "$$" ] && kill $p 2>/dev/null; done
sleep 0.5
LOG=1 nohup node server.js > server.log 2>&1 &
echo $! > server.pid
sleep 1
