import { Fragment, useEffect, useRef, useState } from "react"
import { Ramachandran } from "../WebGL/Ramachandran"
import { cootCommand, postCootMessage } from "../BabyGruUtils"
import { inspect } from 'util'


export const BabyGruRamachandran = (props) => {
    const ramachandranRef = useRef();
    const [clickedResidue, setClickedResidue] = useState(null)
    const [message, setMessage] = useState("")
    const [activeCoordMolNo, setActiveCoordMolNo] = useState(null)
    const [activeChainId, setactiveChainId] = useState(null)
    const [moleculeIndex, setMoleculeIndex] = useState(null)

    
    useEffect(() => {
        if(activeCoordMolNo === null || activeChainId === null || props.molecules.length === 0) {
            return;
        }

        ramachandranRef.current.getRama();

    }, [inspect(props.molecules[moleculeIndex])])


    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.name === clickedResidue.molName);
        if (selectedMoleculeIndex === -1) {
            console.log(`Cannot find molecule ${clickedResidue.molName}`)
            return
        }

        props.molecules[selectedMoleculeIndex].centreOn(props.glRef, clickedResidue)

    }, [clickedResidue])


    return <Fragment>
                <Ramachandran
                    ref={ramachandranRef}
                    onClick={(result) => setClickedResidue(result)} 
                    molecules={props.molecules}
                    cootWorker={props.cootWorker} 
                    postCootMessage={postCootMessage}
                    setMessage={setMessage}
                    setactiveChainId={setactiveChainId}
                    setActiveCoordMolNo={setActiveCoordMolNo}
                    setMoleculeIndex={setMoleculeIndex}
                />
                <div>
                    <span>{message}</span>
                </div>
                
            </Fragment>

}
