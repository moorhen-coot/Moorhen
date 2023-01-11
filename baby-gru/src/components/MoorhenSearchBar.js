import { Fragment, useState, useRef, useEffect } from "react";
import { Row } from "react-bootstrap";
import { Autocomplete, TextField } from "@mui/material";

export const MoorhenSearchBar = (props) => {

    const selectRef = useRef()
    const searchBarRef = useRef()
    const [selectedItemKey, setSelectedItemKey] = useState(null)
    const [openPopup, setOpenPopup] = useState(null)

    const doClick = (element) => {
        console.log(`Search bar is clicking on ${element.id}`)
        let clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        })
        element.dispatchEvent(clickEvent)    
    }

    const getComputedStyle = (element, timeOut=800) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(window.getComputedStyle(element))
            }, timeOut)    
        })
    }

    const doActions = (...actions) => {
        actions.forEach((action, actionIndex) => {
            if (!action.condition) {
                return
            }

            setTimeout(async () => {
                if (action.elementId && !document.getElementById(action.elementId)){
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
                } else if (action.type == 'carousel') {
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
                }
            }, parseInt(50 * actionIndex));
        })
    }

    const searchOptions = [
        {label: "Add waters", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"}, 
            {type: 'setValue', newValue:'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'add-waters-menu-item', condition: true}
        ]},
        {label: "Auto-fit rotamer", actions: [
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
        {label: "Difference Map Peaks", actions: [
            {type: 'click', condition: !props.showSideBar , elementId: 'show-sidebar-button'}, 
            {type: 'click', condition: props.toolAccordionBodyHeight == 0, elementId: 'tools-accordion-button'},
            {type: 'setValue', newValue: 0, condition: true, valueSetter: props.setSelectedToolKey}
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
        {label: "Cis/Trans isomerisation", actions: [
            {type: 'carousel', elementId: 'cis-trans-edit-button', condition: true}
        ]},
        {label: "Eigen Flip Ligand", actions: [
            {type: 'carousel', elementId: 'eigen-flip-edit-button', condition: true}
        ]},
        {label: "Fetch from PDBe", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"}, 
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'setFocus', elementId: 'fetch-pdbe-form', condition: true}
        ]},
        {label: "Flip Peptide", actions: [
            {type: 'carousel', elementId: 'flip-peptide-edit-button', condition: true}
        ]},
        {label: "Get monomer", actions: [
            {type: 'click', elementId: 'ligand-nav-dropdown', condition: props.currentDropdownId !== "Ligand"}, 
            {type: 'setValue', newValue:'Ligand', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Ligand"},
            {type: 'click', elementId: 'get-monomer-menu-item', condition: true}
        ]},
        {label: "Go to cid", actions: [
            {type: 'click', elementId: 'edit-nav-dropdown', condition: props.currentDropdownId !== "Edit"}, 
            {type: 'setValue', newValue:'Edit', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Edit"},
            {type: 'click', elementId: 'go-to-menu-item', condition: true}
        ]},
        {label: "Import dictionary", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'import-dict-menu-item', condition: true}
        ]},
        {label: "Load Coordinates", actions: [
            {type: 'click', elementId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "File"},
            {type: 'click', elementId: 'upload-coordinates-form', condition: true}
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
        {label: "Model Validation", actions: [
            {type: 'click', condition: !props.showSideBar , elementId: 'show-sidebar-button'}, 
            {type: 'click', condition: props.toolAccordionBodyHeight == 0, elementId: 'tools-accordion-button'},
            {type: 'setValue', newValue: 2, condition: true, valueSetter: props.setSelectedToolKey}
        ]},
        {label: "Mutate Residue", actions: [
            {type: 'carousel', elementId: 'mutate-residue-edit-button', condition: true}
        ]},
        {label: "Peptide Flips List", actions: [
            {type: 'click', condition: !props.showSideBar , elementId: 'show-sidebar-button'}, 
            {type: 'click', condition: props.toolAccordionBodyHeight == 0, elementId: 'tools-accordion-button'},
            {type: 'setValue', newValue: 3, condition: true, valueSetter: props.setSelectedToolKey}
        ]},
        {label: "Ramachandran Plot", actions: [
            {type: 'click', condition: !props.showSideBar , elementId: 'show-sidebar-button'}, 
            {type: 'click', condition: props.toolAccordionBodyHeight == 0, elementId: 'tools-accordion-button'},
            {type: 'setValue', newValue: 1, condition: true, valueSetter: props.setSelectedToolKey}
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
            {type: 'carousel', elementId: 'refine-residues-edit-button', condition: true}
        ]},
        {label: "Rotate sidechain", actions: [
            {type: 'carousel', elementId: 'rotate-sidechain-edit-button', condition: true}
        ]},
        {label: "Show Console", actions: [
            {type: 'click', condition: !props.showSideBar , elementId: 'show-sidebar-button'}, 
            {type: 'click', condition: props.consoleBodyHeight == 0, elementId: 'console-accordion-button'},
        ]},
        {label: "Show history", actions: [
            {type: 'click', elementId: 'history-nav-dropdown', condition: props.currentDropdownId !== "History"}, 
            {type: 'setValue', newValue:'History', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "History"},
            {type: 'click', elementId: 'show-history-menu-item', condition: true}
        ]},
        {label: "Show Shortcuts", actions: [
            {type: 'click', elementId: 'preferences-nav-dropdown', condition: props.currentDropdownId !== "Preferences"}, 
            {type: 'setValue', newValue:'Preferences', valueSetter: props.setCurrentDropdownId, condition: props.currentDropdownId !== "Preferences"},
            {type: 'click', elementId: 'configure-shortcuts-menu-item', condition: true}
        ]},
    ]

    const handleChange = (evt, newSelection) => {
        if (newSelection) {
            const newItemIndex = searchOptions.findIndex(item => item.label == newSelection)
            setSelectedItemKey(newItemIndex)
        } else {
            setSelectedItemKey(null)
        }
    }

    useEffect(() => {
        if (selectedItemKey === null) { 
            return
        }
        selectRef.current.value = selectedItemKey
        if(searchBarRef.current) {
            searchBarRef.current.value = "" 
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
                                        backgroundColor:  props.darkMode ? '#222' : 'white',
                                        color: props.darkMode ? 'white' : '#222',
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: props.darkMode ? 'white' : 'grey',
                                    },
                                    '& .MuiButtonBase-root': {
                                        color: props.darkMode ? 'white' : 'grey',
                                    },
                                    '& .MuiFormLabel-root': {
                                        color: props.darkMode ? 'white' : '#222',
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