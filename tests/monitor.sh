#!/bin/sh

pid=$1

counter=120
while ps -p $pid > /dev/null
do
    if [ $counter -eq 0 ] ; then
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
            rc=`grep -c failed test.log`
            if [ $rc -eq 0 ];then
                exit 0
            else
                exit 1
            fi
    fi
    counter=$((counter-1))
    sleep 1
done
