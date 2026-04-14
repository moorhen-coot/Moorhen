// src/components/menu/LoadNoeRestraintsMenuItem.tsx
// import React from "react"
// import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
// import { useCallback, useRef, useState } from "react"
// import { Button, Col, Form, Row } from "react-bootstrap"
// // import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
// import { moorhen } from "../../types/moorhen";
// import { webGL } from "../../types/mgWebGL";
// import { setActiveMap } from "../../store/generalStatesSlice";
// import { batch, useDispatch, useSelector } from 'react-redux';
// import { addMap } from "../../store/mapsSlice";
// import { Store } from "@reduxjs/toolkit";
// import { useSnackbar } from "notistack";
// import { parseNEF_NOEs } from "../../utils/MoorhenNEFParser_tk"
// import { MoorhenButton, MoorhenToggle } from "../inputs";
import { useSnackbar } from "notistack";
import { Button, Col, Form, Row } from "react-bootstrap";
import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMap } from "../../store/mapsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenButton, MoorhenToggle } from "../inputs";
import { libcootApi} from "../../types/libcoot"
let cootModule: libcootApi.CootModule;

// we want a menu button for the user to insert PDB code and fetch NEF 
// or upload NEF file - this might be easier e.g. same method as loading map
// so this is:
// - provide code
// - take from pdb
// - unzip
// - read in
// export const MoorhenImportNOEMenuItem = (props: {
//     commandCentre: React.RefObject<moorhen.CommandCentre>;
//     glRef: React.RefObject<webGL.MGWebGL>;
//     store: Store;
//     setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
// }) => {
//     const dispatch = useDispatch()
    
//     const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

// // this needs to be changed to be NOE specific 
// // do we need to add to moorhen.State to add NOE restraint attribute?
//     const maps = useSelector((state: moorhen.State) => state.maps) 
//     const filesRef = useRef<null | HTMLInputElement>(null);
//     const isDiffRef = useRef<undefined | HTMLInputElement>(null)
//     const [isActiveButton, setIsActiveButton] = useState(true)
//     const store = useStore();

//     const { enqueueSnackbar } = useSnackbar()
export const ImportNOERestraints = () => {
    const dispatch = useDispatch();
    const store = useStore();
    const commandCentre = useCommandCentre();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const filesRef = useRef<null | HTMLInputElement>(null);
    const isDiffRef = useRef<undefined | HTMLInputElement>(null);
    const [isActiveButton, setIsActiveButton] = useState(true);
    const [isDiff, setIsDiff] = useState<boolean>(false);

    const { enqueueSnackbar } = useSnackbar();

    const readNOE = async () => {
        if (filesRef.current.files.length > 0) {
            // setIsActiveButton(false)
            const files = Array.from(filesRef.current.files);
            const newNOE = [];   
            if (files.length > 0 ) {
               const fileContents = await files[0].text()
               console.log(fileContents)
            const parsedNOE = cootModule.get_noe_restraints(fileContents)
               console.log(parsedNOE)
            }
        }     
    };//, [filesRef.current, isDiffRef.current, props.glRef, props.commandCentre, molecules, maps]);


    // const panelContent = <>
    //     <Row>
    //         <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadCCP4Map" className="mb-3">
    //             <Form.Label>NOE restraints...</Form.Label>
    //             <Form.Control ref={filesRef} type="file" multiple={true} accept="nef.gz" />
    //         </Form.Group>
    //     </Row>

    //     <Button variant="primary" onClick={readNOE}> 
    //         OK
    //     </Button>
    // </>

    return (
        <>
            <Row>
                <Form.Group style={{ width: "30rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadNOE" className="mb-3">
                    <Form.Label>NEF restraints...</Form.Label>
                    <Form.Control ref={filesRef} type="file" multiple={true} accept=".nef" />
                </Form.Group>
            </Row>

        </>
    );
}
