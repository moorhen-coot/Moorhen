import { Fragment, useEffect, useRef, useState } from "react"
import { Card, Form, Button, Row, Col, FormCheck } from "react-bootstrap";
import ProtvistaManager from "protvista-manager";
import ProtvistaSequence from "protvista-sequence";
import ProtvistaNavigation from "protvista-navigation";

window.customElements.define("protvista-navigation", ProtvistaNavigation);
window.customElements.define("protvista-sequence", ProtvistaSequence);
window.customElements.define("protvista-manager", ProtvistaManager);

const oneToThree = {'C': 'CYS',
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
                    'M': 'MET'
                }

/**
 * For a given sequence length, calculate the range of 40 residues in the middle
 * @param {Number} sequenceLength sequence lenght
 * @returns {Array} An array containing the display start and display end consisting of a range of 40 residues
 */
const calculateDisplayStartAndEnd = (sequenceLength) => {
    if (sequenceLength <= 40) {
        return [parseFloat("1"), parseFloat(sequenceLength)]
    }
    let middleIndex = Math.round((sequenceLength) / 2)
    return [parseFloat(middleIndex-20), parseFloat( middleIndex+20)]        
}


export const BabyGruSequenceViewer = (props) => {
    const managerRef = useRef(null);
    const sequenceRef = useRef(null);
    const navigationRef = useRef(null);
    const [message, setMessage] = useState("");
    const [start, end] = calculateDisplayStartAndEnd(props.sequence.sequence.length);

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
                    setMessage(`/${evt.detail.feature.start} (${oneToThree[evt.detail.feature.aa]})`)
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

        // TODO: Need to double check that this is actually removing the event listeners
        return () => {
            sequenceRef.current.removeEventListener('change', handleChange);
            sequenceRef.current.removeEventListener('dblclick', disableDoubleClick, true);
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
                        length={props.sequence.sequence.length}
                        displaystart={start}
                        displayend={end}
                        />
                    <protvista-sequence
                        ref={sequenceRef}
                        sequence={props.sequence.sequence}
                        length={props.sequence.sequence.length} 
                        numberofticks={Math.floor(props.sequence.sequence.length/20)}
                        displaystart={start}
                        displayend={end}
                        />
                </protvista-manager>
            </div>    
        </div>
    )
    
}
