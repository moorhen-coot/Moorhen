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


const BabyGruSequence = (props) => {
    const managerRef = useRef(null);
    const sequenceRef = useRef(null);
    const navigationRef = useRef(null);
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [message, setMessage] = useState("");
    const [clickedResidue, setClickedResidue] = useState(null);
    
    const clearSelection = () => {
        sequenceRef.current.trackHighlighter.changedCallBack('highlightstart', null)
        sequenceRef.current.trackHighlighter.changedCallBack('highlightend', null)
    }
      
      const setSelection = (start, end) => {
        sequenceRef.current.trackHighlighter.changedCallBack('highlightstart', start)
        sequenceRef.current.trackHighlighter.changedCallBack('highlightend', end)
    }

    useEffect(()=> {
        const handleChange = (evt) => {
            if (evt.detail.eventtype === "click") {
                if (evt.detail.feature !== null && !(evt.detail.highlight.includes(','))) {
                    setClickedResidue({modelIndex:0, molName:props.molecule.name, chain:props.sequence.chain, seqNum:evt.detail.feature.start})
                } else if (evt.detail.highlight.includes(',')) {
                    let residues = evt.detail.highlight.split(',').map(residue => parseInt(residue.split(':')[0]))
                    setSelectedResidues([Math.min(...residues), Math.max(...residues)])
                }
            } else if (evt.detail.eventtype === "mouseover") {
                if (evt.detail.feature !== null) {
                    setMessage(`/${evt.detail.feature.start} (${oneToThree[evt.detail.feature.aa]})`)
                }
            } else if (evt.detail.eventtype === "mouseout") {
                setMessage("")
            }
        }
        
        sequenceRef.current.addEventListener("change", handleChange)
    
        // TODO: Need to make sure we remove the event listener
        return () => {
          sequenceRef.current.removeEventListener('change', handleChange);
        };
        
      }, []);    

    useEffect(()=> {
        if (selectedResidues !== null) {
          setSelection(...selectedResidues)
        }
    }, [selectedResidues]);

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        props.molecule.centreOn(props.glRef, clickedResidue)

    }, [clickedResidue]);

    
    return (
        <Card className="px-0"  style={{marginBottom:'0.5rem', padding:'0'}}>
            <Card.Header>
                <Row className='align-items-center'>
                    <Col style={{display:'flex', justifyContent:'left'}}>
                        {`${props.molecule.name}/${props.sequence.chain}${message}`}
                    </Col>
                </Row>
            </Card.Header>
            <Card.Body>
                <div style={{width: '100%'}}>
                    <protvista-manager ref={managerRef}>
                        <protvista-navigation ref={navigationRef} length={props.sequence.sequence.length}/>
                        <protvista-sequence
                            ref={sequenceRef}
                            sequence={props.sequence.sequence}
                            length={props.sequence.sequence.length} 
                            numberofticks={Math.floor(props.sequence.sequence.length/10)}
                            />
                    </protvista-manager>
                </div>
            </Card.Body>
        </Card >

    )
    
}

export const BabyGruSequenceViewer = (props) => {
   
    let displayData = [];

    if (props.molecules.length!=0) {
        props.molecules.forEach(
            molecule => molecule.cachedAtoms.sequences.forEach(
                sequence => displayData.push(
                    <BabyGruSequence 
                        coordMolNo={molecule.coordMolNo}
                        sequence={sequence}
                        molecule={molecule}
                        glRef={props.glRef}
                        cootWorker={props.cootWorker}
                        postCootMessage={props.postCootMessage}
                    />
                )
            )
        )
    } 

    return <Fragment>
                {displayData}        
            </Fragment>

}
