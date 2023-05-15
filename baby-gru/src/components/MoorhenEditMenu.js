import { Form, NavDropdown, Spinner, Row, Col, FormSelect, InputGroup, SplitButton, Dropdown } from "react-bootstrap";
import { useCallback, useEffect, useRef, useState } from "react";
import "rc-tree/assets/index.css"
import { MoorhenCopyFragmentUsingCidMenuItem, MoorhenDeleteUsingCidMenuItem, MoorhenMergeMoleculesMenuItem, 
    MoorhenGoToMenuItem, MoorhenAddRemoveHydrogenAtomsMenuItem, MoorhenSuperposeMenuItem} from "./MoorhenMenuItem";
import { Backdrop, IconButton, MenuItem, TextField } from "@mui/material";
import Draggable from "react-draggable";
import { Button, Stack, Card } from "react-bootstrap";
import { CloseOutlined, Download } from "@mui/icons-material";
import { cidToSpec } from "../utils/MoorhenUtils";

import { StandaloneStructServiceProvider } from 'ketcher-standalone'
import { ButtonsConfig, Editor } from 'ketcher-react'
import 'ketcher-react/dist/index.css'
import {
  Ketcher,
  RemoteStructServiceProvider,
  StructServiceProvider
} from 'ketcher-core'

const structServiceProvider = new StandaloneStructServiceProvider()

const MyComponent = () => {
    useEffect(() => {
        const downloadButton = document.getElementsByClassName('Save-module_ok__SgeCM')
        console.log(downloadButton)
        if(downloadButton.lenght > 0){
          downloadButton[0]?.addEventListener('click', handleDownload);
        }
        
    
        return () => {
          if(downloadButton.lenght > 0){
            downloadButton[0]?.removeEventListener('click', handleDownload);
          }
          };
      }, []);
    
    const handleDownload = (event) => {
        // Check if the download event was triggered by the child component
        console.log(event)
        event.stopPropagation()
        if (event.target.matches('.child-download-button')) {
          // Intercept the event and perform additional actions
          event.preventDefault(); // Prevent the default download behavior
          console.log('Download intercepted!');
          // Perform additional actions as needed
        }
      };
    

    return (
    <Draggable>
      <Card>
        <Card.Header>
          This is a ketcher test
        </Card.Header>
        <Card.Body>
        <Editor
          staticResourcesUrl={process.env.PUBLIC_URL}
          structServiceProvider={structServiceProvider}
        />
        </Card.Body>
        <Card.Footer>
          This is a footer
        </Card.Footer>
      </Card>
    </Draggable>
    
  )
}

const MOorhenCreateAcedrgLinkModal = (props) => {
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


    return <MyComponent/>
}

export const MoorhenEditMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [showCreateLinkModal, setShowCreateLinkModal] = useState(true)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
        <NavDropdown
            title="Edit"
            id="edit-nav-dropdown"
            style={{display:'flex', alignItems:'center'}}
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <MoorhenAddRemoveHydrogenAtomsMenuItem key='add_remove_hydrogens' {...menuItemProps}/>
            <MoorhenMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <MoorhenDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <MoorhenSuperposeMenuItem key="superpose_structures" {...menuItemProps} />
            <MoorhenCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
            <MoorhenGoToMenuItem key="go_to_cid" {...menuItemProps} />
            <MenuItem onClick={() => {setShowCreateLinkModal(true)}}>
                Make covalent link...
            </MenuItem>
        </NavDropdown>
        <MOorhenCreateAcedrgLinkModal {...props} showCreateLinkModal={showCreateLinkModal} setShowCreateLinkModal={setShowCreateLinkModal}/>
    </>
}