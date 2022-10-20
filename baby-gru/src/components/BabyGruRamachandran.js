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


    // TODO: REFACTOR THIS CODE, IT IS THE SAME AS IN THE SEQUENCE VIEWER...
    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.name === clickedResidue.molName);
        if (selectedMoleculeIndex === -1) {
            console.log(`Cannot find molecule ${clickedResidue.molName}`)
            return
        }

        // WARNING: Currently we assume that selected model is always the first one...
        let selectedModelIndex = 0
        let selectedChainIndex = props.molecules[selectedMoleculeIndex].cachedAtoms.atoms[selectedModelIndex].chains.findIndex(chain => chain.residues[0].atoms[0]["_atom_site.auth_asym_id"] === clickedResidue.chain);
        if (selectedChainIndex === -1) {
            console.log(`Cannot find chain ${clickedResidue.molName}/${clickedResidue.chain}`)
            return
        }

        let selectedResidueIndex = props.molecules[selectedMoleculeIndex].cachedAtoms.atoms[selectedModelIndex].chains[selectedChainIndex].residues.findIndex(residue => residue.atoms[0]["_atom_site.label_seq_id"] == clickedResidue.seqNum);
        if (selectedResidueIndex === -1) {
            console.log(`Cannot find residue ${clickedResidue.molName}/${clickedResidue.chain}/${clickedResidue.seqNum}`)
        } else {
            let selectedResidueAtoms = props.molecules[selectedMoleculeIndex].cachedAtoms.atoms[selectedModelIndex].chains[selectedChainIndex].residues[selectedResidueIndex].atoms;
            props.glRef.current.setOrigin(props.molecules[selectedMoleculeIndex].cachedAtoms.atoms[selectedModelIndex].centreOnAtoms(selectedResidueAtoms))
        }
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
