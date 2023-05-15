import { useEffect, useRef, useState } from "react";
import { cidToSpec } from "../../utils/MoorhenUtils";

const MoorhenCreateAcedrgLinkModal = (props) => {
    const [atomOne, setAtomOne] = useState(null)
    const [atomTwo, setAtomTwo] = useState(null)
    const [opacity, setOpacity] = useState(1.0)
    const [awaitAtomClick, setAwaitAtomClick] = useState(false)
    const [monomerOneAtoms, setMonomerOneAtoms] = useState([])


    const [atomOneChangeCharge, setAtomOneChangeCharge] = useState(false)
    const [deleteAtom, setDeleteAtom] = useState(false)
    const atomOneValueRef = useRef(null)
    const atomTwoValueRef = useRef(null)
    const atomOneChangeChargeValueRef = useRef(null)
    const bondTypeValueRef = useRef('single')

    const handleCancel = () => {
        setAtomOne(null)
        setAtomTwo(null)
        atomOneValueRef.current = null
        atomTwoValueRef.current = null
        props.setShowCreateLinkModal(false)
    }

    const handleSubmitToAcedrg = () => {
        console.log('NOW SUBMIT THE FOLLOWING INPUT:')
        const acedrgInput = {
            atomOne: atomOneValueRef.current,
            atomTwo: atomTwoValueRef.current,
            bondType: bondTypeValueRef.current
        }
        console.log(acedrgInput)
    }

    const setAtomOneEventListener = async (evt) => {
        const chosenMolecule = props.molecules.find(molecule => molecule.buffersInclude(evt.detail.buffer))
        const chosenAtom = cidToSpec(evt.detail.atom.label)
        const chosenResidueCid = `/${chosenAtom.mol_no}/${chosenAtom.chain_id}/${chosenAtom.res_no}-${chosenAtom.res_no}/*`
        console.log(chosenResidueCid)
        const atoms = await chosenMolecule.gemmiAtomsForCid(chosenResidueCid)
        console.log(atoms)
        console.log(atoms.length)
        setMonomerOneAtoms(atoms)

        atomOneValueRef.current = chosenAtom.cid
        setAtomOne(chosenAtom.cid)
        setAwaitAtomClick(false)
    }

    const setAtomTwoEventListener = (evt) => {
        const chosenAtom = cidToSpec(evt.detail.atom.label)
        atomTwoValueRef.current = chosenAtom.cid
        setAtomTwo(chosenAtom.cid)
        setAwaitAtomClick(false)
    }

    useEffect(() => {
        if (awaitAtomClick === 1) {
            document.addEventListener('atomClicked', setAtomOneEventListener, { once: true })
        } else if (awaitAtomClick === 2) {
            document.addEventListener('atomClicked', setAtomTwoEventListener, { once: true })
        }

        return () => {
            document.removeEventListener('atomClicked', setAtomOneEventListener, { once: true })
            document.removeEventListener('atomClicked', setAtomTwoEventListener, { once: true })
        }
    }, [awaitAtomClick])


    return null
}

