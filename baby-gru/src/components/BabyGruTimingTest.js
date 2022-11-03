import React, { createRef, useEffect, useCallback, forwardRef, useState } from 'react';
import { Button, FormCheck, Row } from "react-bootstrap";

export const BabyGruTimingTest = (props) => {
    const [doJournal, setDoJournal] = useState(false)
    const [floatTimeInMs, setFloatTimeInMs] = useState("")

    const startTimingTest = () => {
        const t0 = performance.now();
        let icount = 0
        //timingTest(icount,1000,t0)
        timingTestFloats(icount, 1000, 40000, t0)
    }

    const timingTestFloats = (icount, maxCount, nFloats, t0) => {
        props.commandCentre.current.cootCommand({
            returnType: "float_array",
            command: "getFloats",
            commandArgs: [nFloats]
        }, doJournal).then(retval => {
            if (icount < maxCount) {
                timingTestFloats(icount + 1, maxCount, nFloats, t0)
            } else {
                const t1 = performance.now();
                setFloatTimeInMs(`${icount} round trips getting ${nFloats} took ${t1 - t0} milliseconds.`)
            }
        })
    }

    const timingTest = (icount, maxCount, t0) => {
        props.commandCentre.current.cootCommand({
            returnType: "int",
            command: "add",
            commandArgs: [icount]
        }, doJournal).then(retval => {
            if (retval.data.result.result < maxCount) {
                timingTest(retval.data.result.result, maxCount, t0)
            } else {
                let icountF = 0
                const t2 = performance.now();
                timingTestFloats(icountF, 1000, 40000, t2)
            }
        })
    }

    return <div>
            <FormCheck
                inline
                name={`doJournal`}
                type="checkbox"
                variant="outline"
                checked={doJournal} 
                label="Journalling"
                onChange={(e) => {
                    setDoJournal(e.target.checked)
                }} />
        <Row>
            <Button onClick={startTimingTest}>
                Run profiling</Button>
        </Row>
        <Row><span>[{floatTimeInMs}]</span></Row>
    </div>

};
