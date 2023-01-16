import React, { useState, useMemo, Fragment, useRef } from "react";
import { Button, DropdownButton } from "react-bootstrap";
import { convertViewtoPx } from '../utils/MoorhenUtils';
import { MenuItem } from "@mui/material";
import { UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, ExpandMoreOutlined, ExpandLessOutlined, VisibilityOffOutlined, VisibilityOutlined, DownloadOutlined, Settings } from '@mui/icons-material';
import { MoorhenDeleteDisplayObjectMenuItem, MoorhenRenameDisplayObjectMenuItem, MoorhenMoleculeBondSettingsMenuItem, MoorhenMergeMoleculesMenuItem, MoorhenRotateTranslateMoleculeMenuItem } from "./MoorhenMenuItem";

export const MoorhenMoleculeCardButtonBar = (props) => {
    const dropdownCardButtonRef = useRef()
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [currentName, setCurrentName] = useState(props.molecule.name);

    useMemo(() => {
        if (currentName === "") {
            return
        }
        props.molecule.name = currentName

    }, [currentName]);


    const actionButtons = {
        1: {
            label: "Undo last action",
            compressed: () => { return (<MenuItem key={1} variant="success" onClick={props.handleUndo} disabled={!props.backupsEnabled}>Undo last action</MenuItem>) },
            expanded: () => {
                return (<Button key={1} size="sm" variant="outlined" style={{borderWidth: props.backupsEnabled ? '' : '0px'}} onClick={props.handleUndo} disabled={!props.backupsEnabled}>
                    <UndoOutlined />
                </Button>)
            }
        },
        2: {
            label: "Redo previous action",
            compressed: () => { return (<MenuItem key={2} variant="success" onClick={props.handleRedo} disabled={!props.backupsEnabled}>Redo previous action</MenuItem>) },
            expanded: () => {
                return (<Button key={2} size="sm" variant="outlined" style={{borderWidth: props.backupsEnabled ? '': '0px'}} onClick={props.handleRedo} disabled={!props.backupsEnabled}>
                    <RedoOutlined />
                </Button>)
            }
        },
        3: {
            label: "Center on molecule",
            compressed: () => { return (<MenuItem key={3} variant="success" onClick={props.handleCentering}>Center on molecule</MenuItem>) },
            expanded: () => {
                return (<Button key={3} size="sm" variant="outlined" onClick={props.handleCentering}>
                    <CenterFocusWeakOutlined />
                </Button>)
            }
        },
        4: {
            label: props.isVisible ? "Hide molecule" : "Show molecule",
            compressed: () => { return (<MenuItem key={4} variant="success" onClick={props.handleVisibility}>{props.isVisible ? "Hide molecule" : "Show molecule"}</MenuItem>) },
            expanded: () => {
                return (<Button key={4} size="sm" variant="outlined" onClick={props.handleVisibility}>
                    {props.isVisible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                </Button>)
            }
        },
        5: {
            label: "Download Molecule",
            compressed: () => { return (<MenuItem key={5} variant="success" onClick={props.handleDownload}>Download molecule</MenuItem>) },
            expanded: () => {
                return (<Button key={5} size="sm" variant="outlined" onClick={props.handleDownload}>
                    <DownloadOutlined />
                </Button>)
            }
        },
        6: {
            label: 'Refine selected residues',
            compressed: () => { return (<MenuItem key={6} variant="success" disabled={(!props.clickedResidue || !props.selectedResidues)} onClick={props.handleResidueRangeRefinement}>Refine selected residues</MenuItem>) },
            expanded: null
        },
        7: {
            label: 'Rename molecule',
            compressed: () => { return (<MoorhenRenameDisplayObjectMenuItem key={7} setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.molecule} />) },
            expanded: null
        },
        8: {
            label: 'Copy selected residues into fragment',
            compressed: () => { return (<MenuItem key={8} variant="success" disabled={(!props.clickedResidue || !props.selectedResidues)} onClick={props.handleCopyFragment}>Copy selected residues into fragment</MenuItem>) },
            expanded: null
        },
        9: {
            label: 'Merge molecules',
            compressed: () => { return (<MoorhenMergeMoleculesMenuItem key={9} glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={setPopoverIsShown} menuItemText="Merge molecule into..." popoverPlacement='left' fromMolNo={props.molecule.molNo}/>) },
            expanded: null
        },
        10: {
            label: 'Display settings',
            compressed: () => { return (<MoorhenMoleculeBondSettingsMenuItem key={10} setPopoverIsShown={setPopoverIsShown} molecule={props.molecule} {...props.bondSettingsProps}/>) },
            expanded: null
        },
        11: {
            label: 'Rotate/Translate molecule',
            compressed: () => { return (<MoorhenRotateTranslateMoleculeMenuItem key={11} setPopoverIsShown={setPopoverIsShown} molecule={props.molecule} changeMolecules={props.changeMolecules} glRef={props.glRef}/>) },
            expanded: null
        },
    }

    const maximumAllowedWidth = props.sideBarWidth * 0.35
    let currentlyUsedWidth = 0
    let expandedButtons = []
    let compressedButtons = []

    Object.keys(actionButtons).forEach(key => {
        if (actionButtons[key].expanded === null) {
            compressedButtons.push(actionButtons[key].compressed())
        } else {
            currentlyUsedWidth += 60
            if (currentlyUsedWidth < maximumAllowedWidth) {
                expandedButtons.push(actionButtons[key].expanded())
            } else {
                compressedButtons.push(actionButtons[key].compressed())
            }
        }
    })

    compressedButtons.push(
        <MoorhenDeleteDisplayObjectMenuItem 
        key="deleteDisplayObjectMenuItem"
        setPopoverIsShown={setPopoverIsShown} 
        glRef={props.glRef} 
        changeItemList={props.changeMolecules} 
        itemList={props.molecules} 
        item={props.molecule} />
    )

    return <Fragment>
        {expandedButtons}
        <DropdownButton
            ref={dropdownCardButtonRef}
            key="dropDownButton"
            title={<Settings />}
            size="sm"
            variant="outlined"
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownMolNo === props.molecule.molNo}
            onToggle={() => { props.molecule.molNo !== props.currentDropdownMolNo ? props.setCurrentDropdownMolNo(props.molecule.molNo) : props.setCurrentDropdownMolNo(-1) }}
            >
                <div style={{maxHeight: convertViewtoPx(40, props.windowHeight) * 0.5, overflowY: 'auto'}}>
                    {compressedButtons}
                </div>
            </DropdownButton>
        <Button key="expandButton"
            size="sm" variant="outlined"
            onClick={() => {
                props.setIsCollapsed(!props.isCollapsed)
            }}>
            {props.isCollapsed ? < ExpandMoreOutlined /> : <ExpandLessOutlined />}
        </Button>
    </Fragment>

}
