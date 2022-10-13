#!/bin/sh
nohup npm test > test.log 2>&1 &
./monitor.sh $! &
