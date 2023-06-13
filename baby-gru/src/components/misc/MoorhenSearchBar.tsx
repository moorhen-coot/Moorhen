import { Fragment, useState, useRef, useEffect } from "react";
import { Row } from "react-bootstrap";
import { Autocomplete, TextField } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "../navbar-menus/MoorhenNavBar";

type clickActionType = {
    type: 'click';
    elementId: string;
    condition: boolean;
}

type valueSetterActionType = {
    type: 'setValue';
    newValue: string | number | boolean ;
    valueSetter: React.Dispatch<React.SetStateAction<string | number | boolean>>;
    condition: boolean;
}

type validationToolSetterActionType = {
    type: 'setValidationTool';
    newValue: string;
    condition: boolean;
}

type carouselActionType = {
    type: 'carousel';
    elementId: string;
    condition: boolean;
}

type focusActionType = {
    type: 'setFocus';
    elementId: string;
    condition: boolean;
}

type searchOptionType = {
    label: string;
    actions: (valueSetterActionType | clickActionType | validationToolSetterActionType | focusActionType | carouselActionType)[];
}

export const MoorhenSearchBar = (props: MoorhenNavBarExtendedControlsInterface) => {

    const selectRef = useRef<JSX.Element>()
    const [selectedItemKey, setSelectedItemKey] = useState<null | number>(null)
    const [openPopup, setOpenPopup] = useState<boolean>(false)

    const dropdownIsClosed = (elementId: string) => {
        if (elementId && !document.getElementById(elementId)){
            return
        }
        const element = document.getElementById(elementId)
        return element.className.includes('hidden')
    }

    const doClick = (element: Element) => {
        console.log(`Search bar is clicking on ${element.id}`)
        let clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        })
        element.dispatchEvent(clickEvent)    
    }

    const getComputedStyle = (element: Element, timeOut: number = 800): Promise<CSSStyleDeclaration> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(window.getComputedStyle(element))
            }, timeOut)    
        })
    }

    const doActions = (...actions: (valueSetterActionType | clickActionType | validationToolSetterActionType | focusActionType | carouselActionType)[]) => {
        actions.forEach((action, actionIndex) => {
            if (!action.condition) {
                return
            }

            setTimeout(async () => {
                if ('elementId' in action && !document.getElementById(action.elementId)){
                    return
                }
                if (action.type === 'click'){
                    let element = document.getElementById(action.elementId)
                    doClick(element)
                } else if (action.type === 'setValue') {
                    console.log(`Search bar is setting a new value ${action.newValue}`)
                    action.valueSetter(action.newValue)
                } else if (action.type === 'setFocus') {
                    console.log(`Search bar is setting focus on component ${action.elementId}`)
                    let element = document.getElementById(action.elementId)
                    element.focus()
                } else if (action.type === 'setValidationTool') {
                    let element: any =  document.getElementById('validation-tool-select')
                    element.value = action.newValue
                    element.dispatchEvent(new Event('change', {'bubbles': true}));
                } else if (action.type === 'carousel') {
                    let elements = document.getElementsByClassName('carousel-control-next')
                    let targetElement = document.getElementById(action.elementId)
                    let iterationCount = 0
                    if (elements.length > 0) {
                        while (true && iterationCount < 5) {
                            iterationCount ++
                            let computedStyle = await getComputedStyle(targetElement.parentElement.parentElement)
                            if (computedStyle.display !== 'none') {
                                break
                            }
                            doClick(elements[0])
                        }
                    } 
                    doClick(targetElement)
                } else {
                    console.log('Unrecognised action type...')
                    console.log(action)
                }
            }, (150 * actionIndex));
        })
    }

    const searchOptions: searchOptionType[] = [
        {label: "Add waters", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"}, 
            {type: 'setValue', newValue:'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'add-waters-menu-item', condition: true}
        ]},
        {label: "Auto-fit rotamer", actions: [
            {type: 'click', elementId: 'open-carousel-drawer', condition: true}, 
            {type: 'carousel', elementId: 'auto-fit-rotamer-edit-button', condition: true}
        ]},
        {label: "Copy fragment", actions: [
            {type: 'click', elementId: 'edit-nav-dropdown', condition: props.currentDropdownId !== "Edit"}, 
            {type: 'setValue', newValue:'Edit', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Edit"},
            {type: 'click', elementId: 'copy-fragment-menu-item', condition: true}
        ]},
        {label: "Delete everything", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"}, 
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'delete-everything-menu-item', condition: true}
        ]},
        {label: "Superpose structures", actions: [
            {type: 'click', elementId: 'calculate-nav-dropdown', condition: props.currentDropdownId !== "Calculate"}, 
            {type: 'setValue', newValue:'Calculate', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Calculate"},
            {type: 'click', elementId: 'superpose-models-menu-item', condition: true}
        ]},
        {label: "Scripting", actions: [
            {type: 'click', elementId: 'calculate-nav-dropdown', condition: props.currentDropdownId !== "Calculate"}, 
            {type: 'setValue', newValue:'Calculate', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Calculate"},
            {type: 'click', elementId: 'interactive-scripting-menu-item', condition: true}
        ]},
        {label: "Difference Map Peaks", actions: [
            {type: 'click', condition: true, elementId: 'open-sidebar-button'}, 
            {type: 'click', condition: dropdownIsClosed('validation-tools-collapse'), elementId: 'validation-tools-dropdown'},
            {type: 'setValidationTool', newValue: "Difference Map Peaks", condition: true}
        ]},
        {label: "Change Background Colour", actions: [
            {type: 'click', elementId: 'view-nav-dropdown', condition: props.currentDropdownId !== "View"}, 
            {type: 'setValue', newValue:'View', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "View"},
            {type: 'click', elementId: 'change-background-colour-menu-item', condition: true}
        ]},
        {label: "Clipping and fogging", actions: [
            {type: 'click', elementId: 'view-nav-dropdown', condition: props.currentDropdownId !== "View"}, 
            {type: 'setValue', newValue:'View', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "View"},
            {type: 'click', elementId: 'clipping-fogging-menu-item', condition: true}
        ]},
        {label: "Lighting settings", actions: [
            {type: 'click', elementId: 'view-nav-dropdown', condition: props.currentDropdownId !== "View"}, 
            {type: 'setValue', newValue:'View', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "View"},
            {type: 'click', elementId: 'lighting-menu-item', condition: true}
        ]},
        {label: "Cis/Trans isomerisation", actions: [
            {type: 'click', elementId: 'open-carousel-drawer', condition: true}, 
            {type: 'carousel', elementId: 'cis-trans-edit-button', condition: true}
        ]},
        {label: "Eigen Flip Ligand", actions: [
            {type: 'click', elementId: 'open-carousel-drawer', condition: true}, 
            {type: 'carousel', elementId: 'eigen-flip-edit-button', condition: true}
        ]},
        {label: "Fetch from PDBe", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"}, 
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'setFocus', elementId: 'fetch-pdbe-form', condition: true}
        ]},
        {label: "Flip Peptide", actions: [
            {type: 'click', elementId: 'open-carousel-drawer', condition: true}, 
            {type: 'carousel', elementId: 'flip-peptide-edit-button', condition: true}
        ]},
        {label: "Get monomer", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"}, 
            {type: 'setValue', newValue:'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'get-monomer-menu-item', condition: true}
        ]},
        {label: "Ligand from SMILES", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"}, 
            {type: 'setValue', newValue:'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'smiles-to-ligand-menu-item', condition: true}
        ]},
        {label: "Fit ligand here", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"}, 
            {type: 'setValue', newValue:'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'fit-ligand-right-here-menu-item', condition: true}
        ]},
        {label: "Centre on ligand", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"}, 
            {type: 'setValue', newValue:'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'centre-on-ligand-menu-item', condition: true}
        ]},
        {label: "Change molecule colours", actions: [
            {type: 'click', elementId: 'view-nav-dropdown', condition: props.currentDropdownId !== "View"}, 
            {type: 'setValue', newValue:'View', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "View"},
            {type: 'click', elementId: 'change-molecule-colours-menu-item', condition: true}
        ]},
        {label: "Go to cid", actions: [
            {type: 'click', elementId: 'edit-nav-dropdown', condition: props.currentDropdownId !== "Edit"}, 
            {type: 'setValue', newValue:'Edit', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Edit"},
            {type: 'click', elementId: 'go-to-menu-item', condition: true}
        ]},
        {label: "Import dictionary", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"},
            {type: 'setValue', newValue: 'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'import-dict-menu-item', condition: true}
        ]},
        {label: "Load Coordinates", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'upload-coordinates-form', condition: true}
        ]},
        {label: "Updating maps", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'connect-molecule-and-map-menu-item', condition: true}
        ]},
        {label: "Recover backup", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'recover-backup-menu-item', condition: true}
        ]},
        {label: "Auto open mtz", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'auto-open-mtz-menu-item', condition: true}
        ]},
        {label: "Load Tutorial Data", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'load-tutorial-data-menu-item', condition: true}
        ]},
        {label: "Merge Molecules", actions: [
            {type: 'click', elementId: 'edit-nav-dropdown', condition: props.currentDropdownId !== "Edit"},
            {type: 'setValue', newValue:'Edit', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Edit"},
            {type: 'click', elementId: 'merge-molecules-menu-item', condition: true}
        ]},
        {label: "Map blurring", actions: [
            {type: 'click', elementId: 'cryo-nav-dropdown', condition: props.currentDropdownId !== "Cryo"},
            {type: 'setValue', newValue:'Cryo', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Cryo"},
            {type: 'click', elementId: 'sharpen-blur-map-menu-item', condition: true}
        ]},
        {label: "Map masking", actions: [
            {type: 'click', elementId: 'cryo-nav-dropdown', condition: props.currentDropdownId !== "Cryo"},
            {type: 'setValue', newValue:'Cryo', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Cryo"},
            {type: 'click', elementId: 'mask-map-menu-item', condition: true}
        ]},
        {label: "Backup settings", actions: [
            {type: 'click', elementId: 'preferences-nav-dropdown', condition: props.currentDropdownId !== "Preferences"},
            {type: 'setValue', newValue:'Preferences', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Preferences"},
            {type: 'click', elementId: 'auto-backup-settings-menu-item', condition: true}
        ]},
        {label: "Updating maps score options", actions: [
            {type: 'click', elementId: 'preferences-nav-dropdown', condition: props.currentDropdownId !== "Preferences"},
            {type: 'setValue', newValue:'Preferences', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Preferences"},
            {type: 'click', elementId: 'updating-maps-scores-options-menu-item', condition: true}
        ]},
        {label: "Configure shortcuts", actions: [
            {type: 'click', elementId: 'preferences-nav-dropdown', condition: props.currentDropdownId !== "Preferences"},
            {type: 'setValue', newValue:'Preferences', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Preferences"},
            {type: 'click', elementId: 'configure-shortcuts-menu-item', condition: true}
        ]},
        {label: "Model Validation", actions: [
            {type: 'click', condition: true, elementId: 'open-sidebar-button'}, 
            {type: 'click', condition: dropdownIsClosed('validation-tools-collapse'), elementId: 'validation-tools-dropdown'},
            {type: 'setValidationTool', newValue: "Validation Plot", condition: true}
        ]},
        {label: "Validation tools", actions: [
            {type: 'click', condition: true, elementId: 'open-sidebar-button'}, 
            {type: 'click', condition: dropdownIsClosed('validation-tools-collapse'), elementId: 'validation-tools-dropdown'},
        ]},
        {label: "Mutate Residue", actions: [
            {type: 'click', elementId: 'open-carousel-drawer', condition: true}, 
            {type: 'carousel', elementId: 'mutate-residue-edit-button', condition: true}
        ]},
        {label: "Peptide Flips List", actions: [
            {type: 'click', condition: true, elementId: 'open-sidebar-button'}, 
            {type: 'click', condition: dropdownIsClosed('validation-tools-collapse'), elementId: 'validation-tools-dropdown'},
            {type: 'setValidationTool', newValue: "Peptide flips using difference map", condition: true}
        ]},
        {label: "Ramachandran Plot", actions: [
            {type: 'click', condition: true, elementId: 'open-sidebar-button'}, 
            {type: 'click', condition: dropdownIsClosed('validation-tools-collapse'), elementId: 'validation-tools-dropdown'},
            {type: 'setValidationTool', newValue: "Ramachandran Plot", condition: true}
        ]},
        {label: "Read mtz", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'import-map-coeff-menu-item', condition: true}
        ]},
        {label: "Read map", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'import-map-menu-item', condition: true}
        ]},
        {label: "Refine residues", actions: [
            {type: 'click', elementId: 'open-carousel-drawer', condition: true}, 
            {type: 'carousel', elementId: 'refine-residues-edit-button', condition: true}
        ]},
        {label: "Rotate sidechain", actions: [
            {type: 'click', elementId: 'open-carousel-drawer', condition: true}, 
            {type: 'carousel', elementId: 'rotate-sidechain-edit-button', condition: true}
        ]},
        {label: "Show Console", actions: [
            {type: 'click', condition: true, elementId: 'open-sidebar-button'}, 
            {type: 'click', condition: dropdownIsClosed('console-collapse'), elementId: 'console-collapse'},
        ]},
        {label: "Show models and maps", actions: [
            {type: 'click', condition: true, elementId: 'open-sidebar-button'}, 
            {type: 'click', condition: dropdownIsClosed('models-and-maps-collapse'), elementId: 'models-maps-dropdown'},
        ]},
    ]

    const handleChange = (evt: React.SyntheticEvent<Element, Event>, newSelection: string) => {
        if (newSelection) {
            const newItemIndex = searchOptions.findIndex(item => item.label === newSelection)
            setSelectedItemKey(newItemIndex)
        } else {
            setSelectedItemKey(null)
        }
    }

    useEffect(() => {
        if (selectedItemKey === null) { 
            return
        }
        
        if (selectedItemKey !== null && searchOptions[selectedItemKey]) {
            doActions(...searchOptions[selectedItemKey].actions)
        }
    }, [selectedItemKey])


    return <Fragment> 
            <Row style={{padding: '0.5rem', width: '20rem'}}>
                <Autocomplete 
                    ref={selectRef}
                    disablePortal
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    freeSolo
                    includeInputInList
                    filterSelectedOptions
                    open={openPopup}
                    onInputChange={(_, value) => {
                        if (value.length === 0) {
                            if (openPopup) setOpenPopup(false);
                        } else {
                            if (!openPopup) setOpenPopup(true);
                        }
                    }}
                    onClose={() => setOpenPopup(false)}
                    sx={{
                        '& .MuiInputBase-root': {
                            backgroundColor:  props.isDark ? '#222' : 'white',
                            color: props.isDark ? 'white' : '#222',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: props.isDark ? 'white' : 'grey',
                        },
                        '& .MuiButtonBase-root': {
                            color: props.isDark ? 'white' : 'grey',
                        },
                        '& .MuiFormLabel-root': {
                            color: props.isDark ? 'white' : '#222',
                        },
                    }}               
                    onChange={handleChange}
                    size='small'
                    options={searchOptions.map(item => item.label)}
                    renderInput={(params) => <TextField {...params} label="Search" />}
                />
            </Row>
    </Fragment> 

}
