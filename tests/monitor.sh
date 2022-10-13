#!/bin/sh

pid=$1

counter=10
while ps -p $pid > /dev/null
do
    if [[ $counter -eq 0 ]] ; then
            nodePid=`ps -ef | grep experimental-wasm-threads | grep $pid | grep -v grep | awk '{print $2}'`
            echo "Killing PID: $pid"
            kill -9 $pid
            if [ -z "$nodePid" ]; then
                true
            else
                echo "Killing node PID: $pid"
                kill -9 $nodePid
            fi
            cat test.log
    fi
    counter=$((counter-1))
    sleep 1
done
