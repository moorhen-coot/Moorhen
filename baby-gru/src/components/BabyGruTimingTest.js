import React, { createRef, useEffect, useCallback, forwardRef } from 'react';
import { Button } from "react-bootstrap";

export const BabyGruTimingTest = (props) => {

    const startTimingTest = () => {

        const t0 = performance.now();
        let icount = 0
        timingTest(icount,1000,t0)

    }

    const timingTestFloats = (icount,maxCount,nFloats,t0) => {
        props.commandCentre.current.cootCommand( {
            returnType: "dummy_array_float",
            command: "getFloats",
            commandArgs: [nFloats]
        }).then(retval => {
            if(icount<maxCount){
                timingTestFloats(icount+1,maxCount,nFloats,t0)
            } else {
                const t1 = performance.now();
                console.log(`Call to ${maxCount} round trip calls getting ${nFloats} floats took ${t1 - t0} milliseconds.`);
            }
        })
    }

    const timingTest = (icount,maxCount,t0) => {
        props.commandCentre.current.cootCommand( {
            returnType: "int",
            command: "add",
            commandArgs: [icount]
        }).then(retval => {
            if(retval.data.result.result<maxCount)
                timingTest(retval.data.result.result,maxCount,t0)
            else {
                const t1 = performance.now();
                console.log(`Call to ${maxCount} round trip calls took ${t1 - t0} milliseconds.`);
                let icountF = 0
                const t2 = performance.now();
                timingTestFloats(icountF,1000,4000,t2)
            }
        })
    }

    return <Button onClick={startTimingTest}>
            Run profiling
            </Button>

};
