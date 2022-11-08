import { NavDropdown, Form, Button, InputGroup, Modal, FormSelect, Col, Row, Overlay, Card, FormCheck, OverlayTrigger, Tooltip, Popover } from "react-bootstrap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMap } from "./BabyGruMap";
import { useEffect, useState, useRef, createRef } from "react";
import { BabyGruMtzWrapper, cootCommand, readTextFile } from '../BabyGruUtils';
import { InsertDriveFile } from "@mui/icons-material";
import { MenuItem } from "@mui/material";
import { BabyGruGetMonomerMenuItem, BabyGruMenuItem } from "./BabyGruMenuItem";

export const BabyGruLigandMenu = (props) => {
    return <>
        <NavDropdown title="Ligand" id="basic-nav-dropdown">
            <BabyGruGetMonomerMenuItem {...props}/>
        </NavDropdown>
    </>
}



