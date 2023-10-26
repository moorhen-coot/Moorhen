import { useEffect, useRef, useState, useCallback } from "react"
import ProtvistaManager from "protvista-manager";
import ProtvistaSequence from "protvista-sequence";
import ProtvistaNavigation from "protvista-navigation";
import ProtvistaTrack from "protvista-track";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { clickedResidueType } from '../card/MoorhenMoleculeCard';
import { useSelector, useDispatch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";

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

const parseSequenceData = (sequence: moorhen.ResidueInfo[]): [number, number, string, number, number]=> {
    let rulerStart = sequence[0].resNum
    let finalSequence: string[] = Array(sequence[sequence.length-1].resNum).fill('-')
    let seqLenght = sequence[sequence.length-1].resNum - rulerStart + 1

    sequence.forEach(residue => {
        finalSequence[residue.resNum - 1] = residue.resCode
    })

    return [rulerStart, seqLenght, finalSequence.join(''), ...calculateDisplayStartAndEnd(rulerStart, seqLenght)]
}

type DisplaySettingsType = {
    rulerStart: number;
    start: number;
    end: number;
    seqLenght: number;
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
}

export const MoorhenSequenceViewer = (props: MoorhenSequenceViewerPropsType) => {
    const managerRef = useRef<any>(null);
    const sequenceRef = useRef<any>(null);
    const navigationRef = useRef<any>(null);
    const selectedResiduesTrackRef = useRef<any>(null)
    const [initialRulerStart, initialSeqLenght, initialDisplaySequence, intialStart, initialEnd] = parseSequenceData(props.sequence.sequence)
    const [message, setMessage] = useState<string>("");
    const [displaySettings, setDisplaySettings] = useState<DisplaySettingsType>({
        rulerStart: initialRulerStart,
        start: intialStart,
        end: initialEnd,
        seqLenght: initialSeqLenght,
        displaySequence: initialDisplaySequence
    });
    const dispatch = useDispatch()
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)

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
        sequenceRef.current.trackHighlighter.changedCallBack('highlightstart', resNum)
        sequenceRef.current.trackHighlighter.changedCallBack('highlightend', resNum)
    } 

    /**
     * Hook used to handle hovering events on the visualisation panel
     */
    useEffect(() => {
        if (hoveredAtom===null || hoveredAtom.molecule === null || hoveredAtom.cid === null || sequenceRef.current === null) {
            return
        }

        const [_, insCode, chainId, resInfo, atomName]   = hoveredAtom.cid.split('/')

        if (chainId !== sequence.chain || !resInfo) {
            return
        }
        
        const resNum = resInfo.split('(')[0]
        
        if (!resNum) {
            return
        }
        
        setMessage(hoveredAtom.cid)
        setHighlight(resNum)

    }, [hoveredAtom])

    
    /**
     * Callback to handle changes in the protvista component
     */
    const handleChange = useCallback((evt) => {
        if (evt.detail.eventtype === "click") {
            let residue = sequence.sequence.find(residue => residue.resNum === evt.detail.feature.start)
            if (!residue) {
                return
            } else if (evt.detail.feature !== null && !(evt.detail.highlight.includes(','))) {
                setClickedResidue({modelIndex:0, molName: molecule.name, chain: sequence.chain, seqNum: evt.detail.feature.start})
                setSelectedResidues(null)
            } else if (evt.detail.highlight.includes(',')) {
                let residues;
                if (clickedResidue === null) {
                    setClickedResidue({modelIndex: 0, molName: molecule.name, chain: sequence.chain, seqNum: evt.detail.feature.start})
                    return
                } else if (selectedResidues === null || selectedResidues.length < 2){
                    residues = [clickedResidue.seqNum, evt.detail.feature.start]
                } else {
                    residues = [evt.detail.feature.start, ...selectedResidues]
                }
                setSelectedResidues([Math.min(...residues), Math.max(...residues)])
                setClickedResidue({modelIndex: 0, molName: molecule.name, chain: sequence.chain, seqNum: evt.detail.feature.start})
            }
        } else if (evt.detail.eventtype === "mouseover") {
            if (evt.detail.feature !== null) {
                let hoveredResidue = sequence.sequence.find(residue => residue.resNum === evt.detail.feature.start)
                if (hoveredResidue) {
                    let cid = hoveredResidue.cid
                    dispatch( setHoveredAtom({ molecule: molecule, cid: cid }) )
                }
            }
        } else if (evt.detail.eventtype === "mouseout") {
            setMessage("")
        }
    }, [clickedResidue, sequence, selectedResidues, molecule, setSelectedResidues, setClickedResidue])


    /**
     * Hook used to control mouse events. Adds an event listener on the protvista-sequence component for mouse clicks 
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
        
        sequenceRef.current.addEventListener("change", handleChange)
        sequenceRef.current.addEventListener('dblclick', disableDoubleClick, true)

        return () => {
            if (sequenceRef && sequenceRef.current) {
                sequenceRef.current.removeEventListener('change', handleChange);
                sequenceRef.current.removeEventListener('dblclick', disableDoubleClick, true);
            }
        };
        
    }, [handleChange]);    
    
    /**
     * Hook used when the component mounts to set the display start and end.
     */
    useEffect(()=> {       
        sequenceRef.current._sequence = displaySettings.displaySequence
        sequenceRef.current._displaystart = displaySettings.start
        sequenceRef.current._displayend = displaySettings.end
        sequenceRef.current.trackHighlighter.element._highlightcolor = hoveredResidueColor
        navigationRef.current._displaystart = displaySettings.start
        navigationRef.current._displayend = displaySettings.end
        selectedResiduesTrackRef.current._displaystart = displaySettings.start
        selectedResiduesTrackRef.current._displayend = displaySettings.end
        selectedResiduesTrackRef.current.trackHighlighter.element._highlightcolor = transparentColor
        
    }, [])

    /**
     * Hook used to update the displayed sequence after adding/removing/mutating a residue in the sequence
     */
    useEffect(()=> {
        const [newRulerStart, newSeqLenght, newDisplaySequence, newStart, newEnd] = parseSequenceData(props.sequence.sequence)
        
        if (newDisplaySequence !== displaySettings.displaySequence) {
            sequenceRef.current.sequence = newDisplaySequence
            navigationRef.current._rulerStart = newRulerStart
            sequenceRef.current._createSequence()
            setDisplaySettings({
                rulerStart: newRulerStart,
                start: newStart,
                end: newEnd,
                seqLenght: newSeqLenght,
                displaySequence: newDisplaySequence     
            })
        }

    }, [props.sequence.sequence])
    
    /**
     * Hook used to clear the current selection if user selects residue from different chain
     */
    useEffect(() => {       
        if (clickedResidue && clickedResidue.chain !== sequence.chain) {
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
                <protvista-manager ref={managerRef}>
                    <protvista-navigation 
                        ref={navigationRef}
                        length={displaySettings.seqLenght}
                        rulerStart={displaySettings.rulerStart}
                        displaystart={displaySettings.start}
                        displayend={displaySettings.end}
                        use-ctrl-to-zoom
                        />
                    <protvista-sequence
                        ref={sequenceRef}
                        sequence={displaySettings.displaySequence}
                        length={displaySettings.seqLenght} 
                        numberofticks="10"
                        displaystart={displaySettings.start}
                        displayend={displaySettings.end}
                        use-ctrl-to-zoom
                        />
                    <protvista-track 
                        ref={selectedResiduesTrackRef}
                        length={displaySettings.seqLenght} 
                        displaystart={displaySettings.start}
                        displayend={displaySettings.end}
                        height='10'
                        use-ctrl-to-zoom
                        />
                </protvista-manager>
            </div>    
        </div>
    )
    
}