import React from 'react'

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Form from 'react-bootstrap/Form';

import Helices from './Helices';
import ProSMART from './ProSMART';
import PDBSearch from './PDBSearch';
import PDB_REDO from './PDB_REDO';
import MiscObjects from './MiscObjects';
import DownloadSF from './DownloadSF';
import OtherDataSources from './OtherDataSources.js';
import ResidueData from './ResidueData.js';

class Utilities extends React.Component {
    constructor(props){
        super(props);
        this.state = { showHelices:true, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showBVals: false};
    }

    selectionChanged(evt) {
        if(evt.target.value==="generate_helices") {
            this.setState({ showHelices:true, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false});
        } else if(evt.target.value==="prosmart") {
            this.setState({ showHelices:false, showProSMART:true, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false});
        } else if(evt.target.value==="pdb_search") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:true, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false});
        } else if(evt.target.value==="pdb_redo") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:true, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false});
        } else if(evt.target.value==="geometric") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:true, showDownloadSF:false, showOtherDataSources: false, showBVals: false});
        } else if(evt.target.value==="download_sf") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:true, showOtherDataSources: false, showBVals: false});
        } else if(evt.target.value==="otherdata") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: true, showBVals: false});
        } else if(evt.target.value==="res_bval") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: true});
        }
    }

    mapChanged(data) {
	this.props.mapChanged(data);
    }

    filePendingChanged(data) {
	this.props.filePendingChanged(data);
    }

    onSVGChange(data) {
	this.props.onSVGChange(data);
    }

    helicesChanged(data) {
	this.props.helicesChanged({pending:data});
    }

    render() {

        const selectionChanged = this.selectionChanged.bind(this);
        return (
        <>
        <Form.Select aria-label="Utilities select example" onChange={selectionChanged}>
            <option value="generate_helices">Generate Helices</option>
            <option value="pdb_search">Search PDB</option>
            <option value="pdb_redo">PDB_REDO</option>
            <option value="otherdata">Get monomer/SMILES</option>
            <option value="prosmart">Prosmart Analysis</option>
            <option value="geometric">Misc. Graphical Objects</option>
            <option value="download_sf">Download Structure Factors</option>
            <option value="res_bval">B-values vs. Residue</option>
        </Form.Select>
        { this.state.showHelices ? <Helices onChange={this.helicesChanged.bind(this)} /> : null }
        { this.state.showProSMART ? <ProSMART /> : null }
        { this.state.showPDBSearch ? <PDBSearch onChange={this.filePendingChanged.bind(this)} /> : null }
        { this.state.showPDB_REDO ? <PDB_REDO  mapChange={this.mapChanged.bind(this)} onPDBChange={this.filePendingChanged.bind(this)} /> : null }
        { this.state.showOtherDataSources ? <OtherDataSources  onSVGChange={this.onSVGChange.bind(this)} /> : null }
        { this.state.showMiscObjects ? <MiscObjects /> : null }
        { this.state.showDownloadSF ? <DownloadSF /> : null }
        { this.state.showBVals ? <ResidueData ref={this.props.bvalRef} sharedArrayBuffer={this.props.sharedArrayBuffer} crystWorker={this.props.crystWorker} /> : null }
        </>
        
    )
  }
}

export default Utilities;
