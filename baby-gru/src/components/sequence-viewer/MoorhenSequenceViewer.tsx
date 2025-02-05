import { useEffect, useRef, useState, useCallback } from "react"
import * as React from 'react';
import "@nightingale-elements/nightingale-manager";
import "@nightingale-elements/nightingale-sequence";
import "@nightingale-elements/nightingale-navigation";
import "@nightingale-elements/nightingale-track";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { clickedResidueType } from '../card/MoorhenMoleculeCard';
import { useSelector, useDispatch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { cidToAtomInfo, cidToSpec } from "../../utils/utils";

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
          "nightingale-manager": any;
          "nightingale-navigation": any;
          "nightingale-sequence": any;
          "nightingale-track": any;
        }
    }
}

 const calculateDisplayStartAndEnd = (rulerStart: number, sequenceLength: number): [number, number] => {
    if (sequenceLength <= 40) {
        return [rulerStart, sequenceLength + rulerStart]
    }
    let middleIndex = Math.round((sequenceLength) / 2)
    return [middleIndex - 20 + rulerStart, middleIndex + 20 + rulerStart]
}

const parseSequenceData = (sequence: moorhen.ResidueInfo[]): [number, number, string, number, number]=> {
    let rulerStart = sequence[0].resNum
    let finalSequence: string[] = Array(sequence[sequence.length-1].resNum).fill('-')
    let seqLength = sequence[sequence.length-1].resNum - rulerStart + 1

    sequence.forEach(residue => {
        finalSequence[residue.resNum - 1] = residue.resCode
    })

    return [rulerStart, seqLength, finalSequence.join(''), ...calculateDisplayStartAndEnd(rulerStart, seqLength)]
}

type DisplaySettingsType = {
    rulerStart: number;
    start: number;
    end: number;
    seqLength: number;
    displaySequence: string;
}

type MoorhenSequenceViewerPropsType = {
    key: string;
    sequence: moorhen.Sequence;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>
    clickedResidue: clickedResidueType;
    setClickedResidue: React.Dispatch<React.SetStateAction<clickedResidueType>>;
    selectedResidues: [number, number];
    setSelectedResidues: React.Dispatch<React.SetStateAction<[number, number]>>;
    useMainStateResidueSelections?: boolean
}

export const MoorhenSequenceViewer = (props: MoorhenSequenceViewerPropsType) => {
    const managerRef = useRef<any>(null);
    const sequenceRef = useRef<any>(null);
    const navigationRef = useRef<any>(null);
    const selectedResiduesTrackRef = useRef<any>(null)
    const shiftKey = useRef<boolean>(false);

    const [initialRulerStart, initialSeqLength, initialDisplaySequence, intialStart, initialEnd] = parseSequenceData(props.sequence.sequence)

    const [message, setMessage] = useState<string>("");
    const [displaySettings, setDisplaySettings] = useState<DisplaySettingsType>({
        rulerStart: initialRulerStart,
        start: intialStart,
        end: initialEnd,
        seqLength: initialSeqLength,
        displaySequence: initialDisplaySequence
    });

    const dispatch = useDispatch()
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)

    const hoveredResidueColor = '#FFEB3B66'
    const transparentColor = '#FFEB3B00'

    const {
        molecule, sequence, clickedResidue,
        setClickedResidue, selectedResidues, setSelectedResidues
    } = props;

    /**
     * Clear highlighted residue range
     */
    const clearSelection = () => {
        const dummyData = [
            {
                "accession": "backgroundLine",
                "color": "red",
                "shape": "line",
                "start": "",
                "end": ""
            },
            {
                "accession": "Outliers",
                "shape": "triangle",
                "color": "red",
                "locations": [{"fragments": []}]
            }
        ]

        selectedResiduesTrackRef.current.data = dummyData
    }

    /**
     * Sets a range of highlighted residues in the sequence viewer
     * @param {Number} start The first residues of the range
     * @param {Number} end The last residue of the range
    */
    const setSelection = (start: number, end: number | null) => {

        let fragments = [{
            "start": start,
            "end": start
        }]

        if (end !== null) {
            fragments.push({
                "start": end,
                "end": end
            })
        }

        const selectedResiduesTrackData  = [
            {
                "accession": "backgroundLine",
                "color": "red",
                "shape": "line",
                "start": start,
                "end": end ? end : start
            },
            {
                "accession": "Outliers",
                "shape": "triangle",
                "color": "red",
                "locations": [{"fragments": fragments}]
            }
        ]

        selectedResiduesTrackRef.current.data = selectedResiduesTrackData
    }

    /**
     * Sets a highlighted residue in the sequence viewer
     */
    const setHighlight = (resNum: string) => {
        //sequenceRef.current.trackHighlighter.changedCallBack('highlightstart', resNum)
        //sequenceRef.current.trackHighlighter.changedCallBack('highlightend', resNum)
    }

    /**
     * Hook used to handle hovering events on the visualisation panel
     */
    useEffect(() => {
        if (hoveredAtom===null || hoveredAtom.molecule === null || hoveredAtom.cid === null || sequenceRef.current === null) {
            return
        }

        const [_, insCode, chainId, resInfo, atomName]   = hoveredAtom.cid.split('/')

        if (chainId !== sequence.chain || !resInfo || hoveredAtom.molecule.molNo !== molecule.molNo) {
            return
        }

        const resNum = resInfo.split('(')[0]

        if (!resNum) {
            return
        }

        setMessage(hoveredAtom.cid)
        setHighlight(resNum)

    }, [hoveredAtom])

    useEffect(() => {
        if (!props.useMainStateResidueSelections) {
            return
        }

        if (residueSelection.molecule && residueSelection.molecule.molNo !== props.molecule.molNo) {
            clearSelection()
            return
        } else if (residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            if (startResSpec.chain_id !== props.sequence.chain) {
                clearSelection()
                return
            }
        }

        if (residueSelection.molecule && residueSelection.cid) {
            const startResSpec = cidToSpec(residueSelection.first)
            const stopResSpec = cidToSpec(residueSelection.second)
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b}) as [number, number]
            setSelection(...sortedResNums)
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            setSelection(startResSpec.res_no, null)
        } else {
            clearSelection()
        }
    }, [residueSelection])

    /**
     * Callback to handle changes in the nightingale component
     */
    const handleChange = useCallback((evt) => {
        setTimeout(() => {
            if (evt.detail.eventType === "click") {
                let residue = sequence.sequence.find(residue => residue.resNum === evt.detail.feature.position)
                if (!residue) {
                    return
                } else if (shiftKey.current && props.useMainStateResidueSelections) {
                    let atomClicked: moorhen.AtomClickedEvent = new CustomEvent("atomClicked", {
                        "detail": {
                            atom: cidToAtomInfo(residue.cid),
                            buffer: {id: props.molecule.representations[0]?.buffers[0]?.id},
                            isResidueSelection: true
                        }
                    })
                    document.dispatchEvent(atomClicked)
                } else if (evt.detail.feature !== null) {
                    setClickedResidue({modelIndex:0, molName: molecule.name, chain: sequence.chain, seqNum: evt.detail.feature.position})
                    setSelectedResidues(null)
                }
            } else if (evt.detail.eventType === "mouseover") {
                if (evt.detail.feature !== null) {
                    let hoveredResidue = sequence.sequence.find(residue => residue.resNum === evt.detail.feature.position)
                    if (hoveredResidue) {
                        let cid = hoveredResidue.cid
                        dispatch( setHoveredAtom({ molecule: molecule, cid: cid }) )
                    }
                }
            } else if (evt.detail.eventType === "mouseout") {
                setMessage("")
            }
        }, 1)
    }, [clickedResidue, sequence, selectedResidues, molecule, setSelectedResidues, setClickedResidue])


    /**
     * Hook used to control mouse events. Adds an event listener on the nightingale-sequence component for mouse clicks
     * and mouse over. It will also disable mouse double click.
     */
    useEffect(()=> {
        if (sequenceRef.current === null) {
            return;
        }

        const disableDoubleClick = (evt: MouseEvent) => {
            evt.preventDefault()
            evt.stopPropagation()
        }

        const handleClick = (evt: MouseEvent) => {
            shiftKey.current = evt.shiftKey
        }

        sequenceRef.current.addEventListener("click", handleClick)
        sequenceRef.current.addEventListener("change", handleChange)
        sequenceRef.current.addEventListener('dblclick', disableDoubleClick, true)

        return () => {
            if (sequenceRef && sequenceRef.current) {
                sequenceRef.current.removeEventListener("click", handleClick)
                sequenceRef.current.removeEventListener('change', handleChange);
                sequenceRef.current.removeEventListener('dblclick', disableDoubleClick, true);
            }
        };

    }, [handleChange]);

    /**
     * Hook used when the component mounts to set the display start and end.
     */
    useEffect(()=> {
        if(sequenceRef && customElements.whenDefined("nightingale-sequence")) {
            sequenceRef.current.sequence = displaySettings.displaySequence
        }
    }, [displaySettings])

    useEffect(()=> {
        if(sequenceRef && customElements.whenDefined("nightingale-sequence")) {
            sequenceRef.current.sequence = displaySettings.displaySequence
            sequenceRef.current.displayStart = displaySettings.start
            sequenceRef.current.displayEnd = displaySettings.end
            //sequenceRef.current.trackHighlighter.element._highlightcolor = hoveredResidueColor
            navigationRef.current.displayStart = displaySettings.start
            navigationRef.current.displayEnd = displaySettings.end
            selectedResiduesTrackRef.current.displayStart = displaySettings.start
            selectedResiduesTrackRef.current.displayEnd = displaySettings.end
            //selectedResiduesTrackRef.current.trackHighlighter.element._highlightcolor = transparentColor
        }
    }, [])

    /**
     * Hook used to update the displayed sequence after adding/removing/mutating a residue in the sequence
     */
    useEffect(()=> {
        if (props.molecule.molNo !== updateMolNo) {
            return
        }

        const newSequence = props.molecule.sequences.find(sequence => sequence.name === props.sequence.name)?.sequence
        if (!newSequence) {
            return
        }

        const [newRulerStart, newSeqLength, newDisplaySequence, newStart, newEnd] = parseSequenceData(newSequence)

        if (newDisplaySequence !== displaySettings.displaySequence) {
            if(sequenceRef && customElements.whenDefined("nightingale-sequence")) {
                sequenceRef.current.sequence = newDisplaySequence
                navigationRef.current.rulerStart = newRulerStart
                sequenceRef.current.createSequence()
                setDisplaySettings({
                    rulerStart: newRulerStart,
                    start: newStart,
                    end: newEnd,
                    seqLength: newSeqLength,
                    displaySequence: newDisplaySequence
                })
            }
        }

    }, [updateSwitch])

    /**
     * Hook used to clear the current selection if user selects residue from different chain
     */
    useEffect(() => {
        if (props.useMainStateResidueSelections) {
            return
        } else if (clickedResidue && clickedResidue.chain !== sequence.chain) {
            clearSelection()
        } else if (clickedResidue && !selectedResidues) {
            setSelection(clickedResidue.seqNum, null)
        }

    }, [clickedResidue]);

    /**
     * Hook used to set a range of highlighted residues
     */
    useEffect(()=> {
        if (selectedResidues !== null  && clickedResidue.chain === sequence.chain) {
          setSelection(...selectedResidues)
        }
    }, [selectedResidues]);

    return (
        <div className='align-items-center' style={{marginBottom:'0', padding:'0'}}>
            <span>{`${molecule.name}${message ? "" : "/" + sequence.chain}${message}`}</span>
            <div style={{width: '100%'}}>
                <nightingale-manager ref={managerRef}>
                    <nightingale-navigation
                        style={{width: '50%'}}
                        ref={navigationRef}
                        length={displaySettings.seqLength}
                        ruler-start={displaySettings.rulerStart}
                        display-start={displaySettings.start}
                        display-end={displaySettings.end}
                        height={40}
                        width={displaySettings.seqLength}
                        use-ctrl-to-zoom
                        />
                    <nightingale-sequence
                        ref={sequenceRef}
                        sequence={displaySettings.displaySequence}
                        length={displaySettings.seqLength}
                        numberofticks="10"
                        display-start={displaySettings.start}
                        display-end={displaySettings.end}
                        height={40}
                        use-ctrl-to-zoom
                        />
                    <nightingale-track
                        ref={selectedResiduesTrackRef}
                        length={displaySettings.seqLength}
                        display-start={displaySettings.start}
                        display-end={displaySettings.end}
                        withHighlight={true}
                        highlight-color={"red"}
                        height={20}
                        use-ctrl-to-zoom
                        />
                </nightingale-manager>
            </div>
        </div>
    )
}

