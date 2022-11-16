import { Fragment, useState, useRef, useEffect } from "react";
import { Form, FormSelect, Col, Row, Overlay, Popover, OverlayTrigger } from "react-bootstrap";
import { BabyGruRamachandran } from "./BabyGruRamachandran"
import { BabyGruValidation } from "./BabyGruValidation"
import { MenuItem } from "@mui/material";

export const BabyGruToolsAccordion = (props) => {
    const selectRef = useRef()
    const searchBarRef = useRef()
    const [selectedToolKey, setSelectedToolKey] = useState(1)
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [currentSearch, setCurrentSearch] = useState(1)

    const toolsKeys = {
        1: {toolName: "Ramachandran Plot", toolWidget: <BabyGruRamachandran {...props}/>},
        2: {toolName: "Validation", toolWidget: <BabyGruValidation {...props}/>},
    }

    const handleChange = (newSelection) => {
        if (newSelection) {
            setSelectedToolKey(newSelection.target.value)
        }
    }

    const searchResults = () => {

        const currentSearch = searchBarRef.current?.value.toLowerCase()
        let currentHits = []
        if (currentSearch) {
            Object.keys(toolsKeys).forEach(key => toolsKeys[key].toolName.toLowerCase().includes(currentSearch) ? currentHits.push(key) : null)
        }
        

        return  <Popover className="search-results-popover" style={{display: currentHits.length > 0 ? '' : 'none'}}>
                    <Popover.Body>
                        {currentHits.map(key => <MenuItem variant="success" onClick={() => {setSelectedToolKey(key)}}>{toolsKeys[key].toolName}</MenuItem>)}
                    </Popover.Body>
                </Popover>
    }

    useEffect(() => {
        selectRef.current.value = selectedToolKey
        if(searchBarRef.current) {
            searchBarRef.current.value = "" 
        } 
    }, [selectedToolKey])


    return <Fragment> 
            <Row style={{padding: '0.5rem'}}>
                <Col>
                    <FormSelect style={{height: '2rem'}} size="sm" ref={selectRef} defaultValue={1} onChange={handleChange}>
                        {Object.keys(toolsKeys).map(key => <option key={key} value={key}>{toolsKeys[key].toolName}</option>)}
                    </FormSelect>
                </Col>
                <Col>
                <OverlayTrigger placement="bottom" show={showSearchResults} overlay={searchResults()}>
                    <Form.Control 
                        style={{height: '2rem'}}
                        className="search-bar-input-text"
                        type="text" 
                        size="sm" 
                        ref={searchBarRef} 
                        placeholder={'Search for a tool...'} 
                        onBlur={() => setShowSearchResults(false)} 
                        onChange={(e) => {setCurrentSearch(e)}}
                        onFocus={() => setShowSearchResults(true)}/>
                </OverlayTrigger>
                </Col>
            </Row>
            <hr style={{marginTop: '1rem', marginBottom: '1rem'}}></hr>
            <Row className="tool-container-row">
                {toolsKeys[selectedToolKey].toolWidget}
            </Row>
        </Fragment> 
}

