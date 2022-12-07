import { Fragment, useState, useRef, useEffect } from "react";
import { Row } from "react-bootstrap";
import { Autocomplete, TextField } from "@mui/material";

export const BabyGruSearchBar = (props) => {

    const selectRef = useRef()
    const searchBarRef = useRef()
    const [selectedItemKey, setSelectedItemKey] = useState(null)

    const handleTest = () => {
        let element;
        let clickEvent;
        clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        })
        element = document.getElementById('file-nav-dropdown')
        element.dispatchEvent(clickEvent)    
        setTimeout(() => {
            let element;
            let clickEvent;
            clickEvent = new MouseEvent("click", {
                "view": window,
                "bubbles": true,
                "cancelable": false
            })
            element  = document.getElementById('upload-coordinates-form')
            element.dispatchEvent(clickEvent)    
        }, 50);        

    }

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
                    console.log(`CLICK ON ${action.componentId}`)
                    clickEvent = new MouseEvent("click", {
                        "view": window,
                        "bubbles": true,
                        "cancelable": false
                    })
                    element = document.getElementById(action.componentId)
                    element.dispatchEvent(clickEvent)    
                } else if (action.type === 'setValue') {
                    action.valueSetter(action.newValue)
                }
            }, parseInt(50 * actionIndex));
        })
    }

    const searchOptions = [
        {label: "Difference Map Peaks", actions: [
            {type: 'click', condition: true , componentId: 'show-sidebar-button'}, 
            {type: 'click', condition: true, componentId: 'tools-accordion-button'},
            {type: 'setValue', newValue: 0, condition: true, valueSetter: props.setSelectedToolKey}
        ]},
        {label: "Fetch from PDBe", actions: [
            {type: 'click', componentId: 'file-nav-dropdown', condition: true}, {type: 'click', componentId: 'fetch-pdbe-form', condition: true}
        ]},
        {label: "Flip Peptide", actions: [
            {type: 'click', componentId: 'flip-peptide-edit-button', condition: true}
        ]},
        {label: "Load coordinates", actions: [
            {type: 'click', componentId: 'file-nav-dropdown', condition: true}, {type: 'click', componentId: 'upload-coordinates-form', condition: true}
        ]},
        {label: "Load tutorial data", actions: [
            {type: 'click', componentId: 'file-nav-dropdown', condition: true}, {type: 'click', componentId: 'load-tutorial-data-menu-item', condition: true}
        ]},
        {label: "Ramachandran Plot", actions: [
            {type: 'click', condition: true , componentId: 'show-sidebar-button'}, 
            {type: 'click', condition: true, componentId: 'tools-accordion-button'},
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
                    disablePortal
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
                    ref={selectRef}
                    onChange={handleChange}
                    size='small'
                    options={searchOptions.map(item => item.label)}
                    renderInput={(params) => <TextField {...params} label="Search" />}
                />
        </Row>
    </Fragment> 

}