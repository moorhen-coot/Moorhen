import { useEffect, useRef, useState, useCallback } from "react"
import ProtvistaManager from "protvista-manager";
import ProtvistaSequence from "protvista-sequence";
import ProtvistaNavigation from "protvista-navigation";
import ProtvistaTrack from "protvista-track";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { clickedResidueType } from '../card/MoorhenMoleculeCard';
import { libcootApi } from "../../types/libcoot";

!window.customElements.get('protvista-navigation') && window.customElements.define("protvista-navigation", ProtvistaNavigation);
!window.customElements.get('protvista-sequence') && window.customElements.define("protvista-sequence", ProtvistaSequence);
!window.customElements.get('protvista-track') && window.customElements.define("protvista-track", ProtvistaTrack);
!window.customElements.get('protvista-manager') && window.customElements.define("protvista-manager", ProtvistaManager);

const calculateDisplayStartAndEnd = (rulerStart: number, sequenceLength: number): [number, number] => {
    if (sequenceLength <= 40) {
        return [rulerStart, sequenceLength + rulerStart]
    }
    let middleIndex = Math.round((sequenceLength) / 2)
    return [middleIndex - 20 + rulerStart, middleIndex + 20 + rulerStart]        
}

export const MoorhenSequenceAlignment = (props: {
    referenceSequence: string;
    movingSequence: string;
    alignedPairsData: { reference: libcootApi.ValidationInformationJS, moving: libcootApi.ValidationInformationJS }[]
}) => {

    const managerRef = useRef<any>(null);
    const refSeqRef = useRef<any>(null);
    const movSeqRef = useRef<any>(null);
    const navigationRef = useRef<any>(null);

    const initialRulerStart = props.alignedPairsData[0].reference.seqNum
    console.log('HI')
    console.log(props.alignedPairsData)
    console.log(props.referenceSequence.length)
    const [intialStart, initialEnd] = calculateDisplayStartAndEnd(initialRulerStart, props.referenceSequence.length)
    const hoveredResidueColor = '#FFEB3B66'
    const transparentColor = '#FFEB3B00'

    /**
     * Hook used when the component mounts to set the display start and end.
     */
    useEffect(()=> {       
        refSeqRef.current._sequence = props.referenceSequence
        refSeqRef.current._displaystart = intialStart
        refSeqRef.current._displayend = initialEnd
        refSeqRef.current.trackHighlighter.element._highlightcolor = hoveredResidueColor
        movSeqRef.current._sequence = props.movingSequence
        movSeqRef.current._displaystart = intialStart
        movSeqRef.current._displayend = initialEnd
        movSeqRef.current.trackHighlighter.element._highlightcolor = hoveredResidueColor
        navigationRef.current._displaystart = intialStart
        navigationRef.current._displayend = initialEnd
        
    }, [])

    return (
        <div className='align-items-center' style={{marginBottom:'0', padding:'0'}}>
            <div style={{width: '100%'}}>
                <protvista-manager ref={managerRef}>
                    <protvista-navigation 
                        ref={navigationRef}
                        length={props.referenceSequence.length}
                        rulerStart={initialRulerStart}
                        displaystart={intialStart}
                        displayend={initialEnd}
                        use-ctrl-to-zoom
                    />
                    <protvista-sequence
                        ref={refSeqRef}
                        sequence={props.referenceSequence}
                        length={props.referenceSequence.length} 
                        numberofticks="10"
                        displaystart={intialStart}
                        displayend={initialEnd}
                        use-ctrl-to-zoom
                    />
                    <protvista-sequence
                        ref={movSeqRef}
                        sequence={props.movingSequence}
                        length={props.movingSequence.length} 
                        numberofticks="10"
                        displaystart={intialStart}
                        displayend={initialEnd}
                        use-ctrl-to-zoom
                    />

                </protvista-manager>
            </div>    
        </div>
    )
    
}