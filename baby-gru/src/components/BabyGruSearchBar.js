import { Fragment, useState, useRef, useEffect } from "react";
import { Row } from "react-bootstrap";
import { Autocomplete, TextField } from "@mui/material";

export const BabyGruSearchBar = (props) => {

    const selectRef = useRef()
    const searchBarRef = useRef()
    const [selectedItemKey, setSelectedItemKey] = useState(null)
    const [openPopup, setOpenPopup] = useState(null)

    const handleActions = (...actions) => {
        actions.forEach((action, actionIndex) => {
            if (!action.condition) {
                return
            }

            setTimeout(() => {
                if (action.componentId && !document.getElementById(action.componentId)){
                    return
                }
                let element;
                let clickEvent;
                if (action.type === 'click'){
                    console.log(`Search bar is clicking on ${action.componentId}`)
                    clickEvent = new MouseEvent("click", {
                        "view": window,
                        "bubbles": true,
                        "cancelable": false
                    })
                    element = document.getElementById(action.componentId)
                    element.dispatchEvent(clickEvent)    
                } else if (action.type === 'setValue') {
                    console.log(`Search bar is setting a new value ${action.newValue}`)
                    action.valueSetter(action.newValue)
                } else if (action.type === 'setFocus') {
                    console.log(`Search bar is setting focus on component ${action.componentId}`)
                    element = document.getElementById(action.componentId)
                    element.focus()
                }
            }, parseInt(50 * actionIndex));
        })
    }

    const searchOptions = [
        {label: "Difference Map Peaks", actions: [
            {type: 'click', condition: !props.showSideBar , componentId: 'show-sidebar-button'}, 
            {type: 'click', condition: props.toolAccordionBodyHeight == 0, componentId: 'tools-accordion-button'},
            {type: 'setValue', newValue: 0, condition: true, valueSetter: props.setSelectedToolKey}
        ]},
        {label: "Fetch from PDBe", actions: [
            {type: 'click', componentId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"}, 
            {type: 'setFocus', componentId: 'fetch-pdbe-form', condition: true}
        ]},
        {label: "Flip Peptide", actions: [
            {type: 'click', componentId: 'flip-peptide-edit-button', condition: true}
        ]},
        {label: "Load coordinates", actions: [
            {type: 'click', componentId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: true},
            {type: 'click', componentId: 'upload-coordinates-form', condition: true}
        ]},
        {label: "Load tutorial data", actions: [
            {type: 'click', componentId: 'file-nav-dropdown', condition: props.currentDropdownId !== "File"},
            {type: 'setValue', newValue:'File', valueSetter: props.setCurrentDropdownId, condition: true},
            {type: 'click', componentId: 'load-tutorial-data-menu-item', condition: true}
        ]},
        {label: "Ramachandran Plot", actions: [
            {type: 'click', condition: !props.showSideBar , componentId: 'show-sidebar-button'}, 
            {type: 'click', condition: props.toolAccordionBodyHeight == 0, componentId: 'tools-accordion-button'},
            {type: 'setValue', newValue: 1, condition: true, valueSetter: props.setSelectedToolKey}
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
        if (selectedItemKey !== null) {
            handleActions(...searchOptions[selectedItemKey].actions)
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