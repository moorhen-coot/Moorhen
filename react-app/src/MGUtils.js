import React from 'react'

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Form from 'react-bootstrap/Form';

class Helices extends React.Component {
    constructor(props){
        super(props);
        this.state = { };
    }
    render() {
        return (
        <div id="generate_helices">
        Generate Helices
        </div>
        )
    }
}

class ProSMART extends React.Component {
    constructor(props){
        super(props);
        this.state = { };
    }
    render() {
        return (
        <div id="prosmart">
        Prosmart Analysis
        </div>
        )
    }
}

class PDBSearch extends React.Component {
    constructor(props){
        super(props);
        this.state = { };
    }
    render() {
        return (
        <div id="pdb_search">
        Search PDB
        </div>
        )
    }
}

class PDB_REDO extends React.Component {
    constructor(props){
        super(props);
        this.state = { };
    }
    render() {
        return (
        <div id="pdb_redo">
        PDB_REDO
        </div>
        )
    }
}

class MiscObjects extends React.Component {
    constructor(props){
        super(props);
        this.state = { };
    }
    render() {
        return (
        <div id="geometric">
        Misc. Graphical Objects
        </div>
        )
    }
}

class DownloadSF extends React.Component {
    constructor(props){
        super(props);
        this.state = { };
    }
    render() {
        return (
        <div id="download_sf">
        Download Structure Factors
        </div>
        )
    }
}

class Utilities extends React.Component {
    constructor(props){
        super(props);
        this.state = { showHelices:true, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false};
    }

    selectionChanged(evt) {
        if(evt.target.value==="generate_helices") {
            this.setState({ showHelices:true, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false});
        } else if(evt.target.value==="prosmart") {
            this.setState({ showHelices:false, showProSMART:true, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false});
        } else if(evt.target.value==="pdb_search") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:true, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false});
        } else if(evt.target.value==="pdb_redo") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:true, showMiscObjects:false, showDownloadSF:false});
        } else if(evt.target.value==="geometric") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:true, showDownloadSF:false});
        } else if(evt.target.value==="download_sf") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:true});
        }
    }

    render() {

        const selectionChanged = this.selectionChanged.bind(this);
        return (
        <>
        <Form.Select aria-label="Utilities select example" onChange={selectionChanged}>
            <option value="generate_helices">Generate Helices</option>
            <option value="prosmart">Prosmart Analysis</option>
            <option value="pdb_search">Search PDB</option>
            <option value="pdb_redo">PDB_REDO</option>
            <option value="geometric">Misc. Graphical Objects</option>
            <option value="download_sf">Download Structure Factors</option>
        </Form.Select>
        { this.state.showHelices ? <Helices /> : null }
        { this.state.showProSMART ? <ProSMART /> : null }
        { this.state.showPDBSearch ? <PDBSearch /> : null }
        { this.state.showPDB_REDO ? <PDB_REDO /> : null }
        { this.state.showMiscObjects ? <MiscObjects /> : null }
        { this.state.showDownloadSF ? <DownloadSF /> : null }
        </>
        
    )
  }
}

export default Utilities;
