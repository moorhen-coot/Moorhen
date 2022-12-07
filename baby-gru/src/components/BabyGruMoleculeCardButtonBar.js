import React, { useEffect, useState, useMemo, Fragment, forwardRef, useRef, useCallback } from "react";
import { Button, DropdownButton } from "react-bootstrap";
import { convertViewtoPx } from '../utils/BabyGruUtils';
import { MenuItem } from "@mui/material";
import { UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, ExpandMoreOutlined, ExpandLessOutlined, VisibilityOffOutlined, VisibilityOutlined, DownloadOutlined, Settings } from '@mui/icons-material';
import { BabyGruDeleteDisplayObjectMenuItem, BabyGruRenameDisplayObjectMenuItem, BabyGruMoleculeBondSettingsMenuItem, BabyGruMergeMoleculesMenuItem } from "./BabyGruMenuItem";

export const BabyGruMoleculeCardButtonBar = (props) => {
    const dropdownCardButtonRef = useRef()
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [dropdownMenuItemShown, setDropdownMenuItemShown] = useState(0)
    const [currentName, setCurrentName] = useState(props.molecule.name);

    useEffect(() => {
        setDropdownMenuItemShown(0)
    }, [props.windowHeight, props.sideBarWidth]);

    useMemo(() => {
        if (currentName == "") {
            return
        }
        props.molecule.name = currentName

    }, [currentName]);


    const actionButtons = {
        1: {
            label: "Undo last action",
            compressed: () => { return (<MenuItem key={1} variant="success" onClick={props.handleUndo}>Undo last action</MenuItem>) },
            expanded: () => {
                return (<Button key={1} size="sm" variant="outlined" onClick={props.handleUndo}>
                    <UndoOutlined />
                </Button>)
            }
        },
        2: {
            label: "Redo previous action",
            compressed: () => { return (<MenuItem key={2} variant="success" onClick={props.handleRedo}>Redo previous action</MenuItem>) },
            expanded: () => {
                return (<Button key={2} size="sm" variant="outlined" onClick={props.handleRedo}>
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
            compressed: () => { return (<BabyGruRenameDisplayObjectMenuItem key={7} setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.molecule} />) },
            expanded: null
        },
        8: {
            label: 'Copy selected residues into fragment',
            compressed: () => { return (<MenuItem key={8} variant="success" disabled={(!props.clickedResidue || !props.selectedResidues)} onClick={props.handleCopyFragment}>Copy selected residues into fragment</MenuItem>) },
            expanded: null
        },
        9: {
            label: 'Merge molecules',
            compressed: () => { return (<BabyGruMergeMoleculesMenuItem key={9} glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={setPopoverIsShown} menuItemText="Merge molecule into..." popoverPlacement='left' fromMolNo={props.molecule.molNo}/>) },
            expanded: null
        },
        10: {
            label: 'Display settings',
            compressed: () => { return (<BabyGruMoleculeBondSettingsMenuItem key={10} setPopoverIsShown={setPopoverIsShown} molecule={props.molecule} {...props.bondSettingsProps}/>) },
            expanded: null
        },
    }

    const maximumAllowedWidth = props.sideBarWidth * 0.35
    const maximumAllowedHeight = convertViewtoPx(40, props.windowHeight) * 0.5
    let currentlyUsedWidth = 0
    let currentlyUsedHeight = 0
    let expandedButtons = []
    let compressedButtons = [[]]
    let currentCompressedButtonItemIndex = 0
    
    const handleTransition = useCallback(() => {
        setDropdownMenuItemShown((prev) => {
            let newValue = prev + 1
            if (newValue !== compressedButtons.length) {
                return newValue
            } else {
                return 0
            }
        })
    }, [compressedButtons.length])

    const getTransitionButton = (index) => {
        return  <MenuItem style={{width: '20rem', justifyContent:'between', display:'flex'}} key={`${index}_next_item`} variant="success" onClick={handleTransition}>
                    <ExpandMoreOutlined/> More...
                </MenuItem>
    }

    const SlideItem = forwardRef((props, ref) => {
        return (
          <div ref={ref} style={{display: props.index == dropdownMenuItemShown ? "" : "none"}}>
            {compressedButtons[props.index]}
          </div>
        );
      })
      

    Object.keys(actionButtons).forEach(key => {
        if (actionButtons[key].expanded === null) {
            currentlyUsedHeight += 35
            if (currentlyUsedHeight < maximumAllowedHeight) {
                compressedButtons[currentCompressedButtonItemIndex].push(actionButtons[key].compressed())
            } else {
                compressedButtons[currentCompressedButtonItemIndex].push(getTransitionButton(currentCompressedButtonItemIndex))
                currentCompressedButtonItemIndex ++
                compressedButtons.push([actionButtons[key].compressed()])
                currentlyUsedHeight = 35
            }
        } else {
            currentlyUsedWidth += 60
            if (currentlyUsedWidth < maximumAllowedWidth) {
                expandedButtons.push(actionButtons[key].expanded())
            } else {
                currentlyUsedHeight += 35
                if (currentlyUsedHeight < maximumAllowedHeight) {
                    compressedButtons[currentCompressedButtonItemIndex].push(actionButtons[key].compressed())
                } else {
                    compressedButtons[currentCompressedButtonItemIndex].push(getTransitionButton(currentCompressedButtonItemIndex))
                    currentCompressedButtonItemIndex ++
                    compressedButtons.push([actionButtons[key].compressed()])
                    currentlyUsedHeight = 35
                }
            }
        }
    })

    compressedButtons[currentCompressedButtonItemIndex].push(
        <BabyGruDeleteDisplayObjectMenuItem 
        key="deleteDisplayObjectMenuItem"
        setPopoverIsShown={setPopoverIsShown} 
        glRef={props.glRef} 
        changeItemList={props.changeMolecules} 
        itemList={props.molecules} 
        item={props.molecule} />
    )

    if (compressedButtons.length > 1) {
        compressedButtons[currentCompressedButtonItemIndex].push(getTransitionButton(currentCompressedButtonItemIndex))
    }

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
                {compressedButtons[dropdownMenuItemShown]}
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
