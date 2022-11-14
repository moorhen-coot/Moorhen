import { Fragment, useEffect, useRef, useState } from "react"
import { Card, Form, Button, Row, Col, FormCheck } from "react-bootstrap";
import ProtvistaManager from "protvista-manager";
import ProtvistaSequence from "protvista-sequence";
import ProtvistaNavigation from "protvista-navigation";

window.customElements.define("protvista-navigation", ProtvistaNavigation);
window.customElements.define("protvista-sequence", ProtvistaSequence);
window.customElements.define("protvista-manager", ProtvistaManager);

const residueCodesOneToThree = {'C': 'CYS',
                    'D': 'ASP',
                    'S': 'SER',
                    'Q': 'GLN',
                    'K': 'LYS',
                    'I': 'ILE',
                    'P': 'PRO',
                    'T': 'THR',
                    'F': 'PHE',
                    'N': 'ASN',
                    'G': 'GLY',
                    'H': 'HIS',
                    'L': 'LEU',
                    'R': 'ARG',
                    'W': 'TRP',
                    'A': 'ALA',
                    'V': 'VAL',
                    'E': 'GLU',
                    'Y': 'TYR',
                    'M': 'MET',
                    'UNK': 'UNKOWN',
                    '-': 'MISSING'
                }

const nucleotideCodesOneToThree = {"A": "A",
            "T": "T",
            "G": "G",
            "C": "C",
            "U": "U",
            "N": "N",
            "I": "I",
            "X": "UNKOWN",
            'UNK': 'UNKOWN',
            '-': 'MISSING'
            }

/**
 * For a given sequence length, calculate the range of 40 residues in the middle
 * @param {Number} sequenceLength sequence lenght
 * @returns {Array} An array containing the display start and display end consisting of a range of 40 residues
 */
const calculateDisplayStartAndEnd = (rulerStart, sequenceLength) => {
    if (sequenceLength <= 40) {
        return [parseFloat(rulerStart), parseFloat(sequenceLength + rulerStart)]
    }
    let middleIndex = Math.round((sequenceLength) / 2)
    return [parseFloat(middleIndex - 20 + rulerStart), parseFloat(middleIndex + 20 + rulerStart)]        
}


const parseSequenceData = (sequence) => {
    let rulerStart = sequence[0].resNum
    let finalSequence = Array(sequence[sequence.length-1].resNum).fill('-')
    let seqLenght = sequence[sequence.length-1].resNum - rulerStart + 1
    
    sequence.forEach(residue => {
        finalSequence[residue.resNum - 1] = residue.resCode
    })
            
    return [rulerStart, seqLenght, finalSequence.join('')]
}

export const BabyGruSequenceViewer = (props) => {
    const managerRef = useRef(null);
    const sequenceRef = useRef(null);
    const navigationRef = useRef(null);
    const [message, setMessage] = useState("");
    const [rulerStart, seqLenght, displaySequence] = parseSequenceData(props.sequence.sequence)
    const [start, end] = calculateDisplayStartAndEnd(rulerStart, seqLenght);


    /**
     * Clear highlighted residue range
     */
    const clearSelection = () => {
        sequenceRef.current.trackHighlighter.changedCallBack('highlightstart', null)
        sequenceRef.current.trackHighlighter.changedCallBack('highlightend', null)
    }
    
    /**
     * Sets a range of highlighted residues in the sequence viewer 
     * @param {Number} start The first residues of the range
     * @param {Number} end The last residue of the range
     */
    const setSelection = (start, end) => {
        sequenceRef.current.trackHighlighter.changedCallBack('highlightstart', start)
        sequenceRef.current.trackHighlighter.changedCallBack('highlightend', end)
    }

    /**
     * Hook used to control mouse events. Adds an event listener on the protvista-sequence component for mouse clicks 
     * and mouse over. It will also disable mouse double click.
     */
    useEffect(()=> {
        
        if (sequenceRef.current === null) {
            return;
        }

        const handleChange = (evt) => {
            if (evt.detail.eventtype === "click") {
                if (evt.detail.feature !== null && !(evt.detail.highlight.includes(','))) {
                    props.setClickedResidue({modelIndex:0, molName:props.molecule.name, chain:props.sequence.chain, seqNum:evt.detail.feature.start})
                } else if (evt.detail.highlight.includes(',')) {
                    let residues = evt.detail.highlight.split(',').map(residue => parseInt(residue.split(':')[0]))
                    props.setSelectedResidues([Math.min(...residues), Math.max(...residues)])
                }
            } else if (evt.detail.eventtype === "mouseover") {
                if (evt.detail.feature !== null) {
                    setMessage(`/${evt.detail.feature.start} (${props.sequence.type==="polypeptide(L)" ? residueCodesOneToThree[evt.detail.feature.aa] : nucleotideCodesOneToThree[evt.detail.feature.aa]})`)
                }
            } else if (evt.detail.eventtype === "mouseout") {
                setMessage("")
            }
        }

        const disableDoubleClick = (evt) => {
            console.log("Double-click is disabled in the sequence viewer...")
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
        
      }, []);    
    
    /**
     * Hook used to clear the current selection if user selects residue from different chain
     */
     useEffect(() => {       
        if (props.clickedResidue && props.clickedResidue.chain != props.sequence.chain) {
            clearSelection()
        }
    }, [props.clickedResidue]);

    /**
     * Hook used to set a range of highlighted residues
     */
    useEffect(()=> {
        if (props.selectedResidues !== null  && props.clickedResidue.chain === props.sequence.chain) {
          setSelection(...props.selectedResidues)
        }
    }, [props.selectedResidues]);

    /**
     * Hook used on component start-up to define the protvista-navigation and protvista-sequence display start and end
     */
    useEffect(()=> {
       
        if(sequenceRef){
            sequenceRef.current._displaystart = start
            sequenceRef.current._displayend = end
        }
        if(navigationRef){
            navigationRef.current._displaystart = start
            navigationRef.current._displayend = end
        }
        
    }, [props.sequence]);

    return (
        <div className='align-items-center' style={{marginBottom:'1rem', padding:'0'}}>
            <span>{`${props.molecule.name}/${props.sequence.chain}${message}`}</span>
            <div style={{width: '100%'}}>
                <protvista-manager ref={managerRef}>
                    <protvista-navigation 
                        ref={navigationRef}
                        length={seqLenght}
                        rulerStart={rulerStart}
                        displaystart={start}
                        displayend={end}
                        use-ctrl-to-zoom
                        />
                    <protvista-sequence
                        ref={sequenceRef}
                        sequence={displaySequence}
                        length={seqLenght} 
                        numberofticks="10"
                        displaystart={start}
                        displayend={end}
                        use-ctrl-to-zoom
                        />
                </protvista-manager>
            </div>    
        </div>
    )
    
}
