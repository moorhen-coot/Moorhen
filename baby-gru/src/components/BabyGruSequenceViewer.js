import { Fragment, useEffect, useRef, useState } from "react"
import { SequenceViewer } from "../WebGL/SequenceViewer"

export const BabyGruSequenceViewer = (props) => {
    const sequenceViewer = useRef()
    const [message, setMessage] = useState("")
    const [clickedResidue, setClickedResidue] = useState(null)

    useEffect(() => {
        props.molecules.forEach((molecule) => {
            console.log(molecule.cachedAtoms)
        })
        sequenceViewer.current.handleResize()
        sequenceViewer.current.draw()
    }, [])

    useEffect(() => {
        props.molecules.forEach((molecule) => {
            console.log(molecule.cachedAtoms)
            sequenceViewer.current.addSequences(molecule.cachedAtoms.sequences)
        })
        sequenceViewer.current.handleResize()
        sequenceViewer.current.draw()
    }, [props.molecules.length])


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
        <span>{message}</span>
        <SequenceViewer
            ref={sequenceViewer}
            selectionChanged={(result) => { }}
            onDoubleClick={(result) => { setClickedResidue(result)}}
            messageChanged={(result) => { setMessage(result.message) }} />
    </Fragment>

}
