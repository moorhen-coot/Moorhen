import React from 'react'

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import Helices from './Helices';
import ProSMART from './ProSMART';
import PDBSearch from './PDBSearch';
import PDB_REDO from './PDB_REDO';
import MiscObjects from './MiscObjects';
import DownloadSF from './DownloadSF';
import OtherDataSources from './OtherDataSources.js';
import ResidueData from './ResidueData.js';
import ResidueMapData from './ResidueMapData.js';
import ResidueList from './ResidueList.js';
import RamaBalls from './RamaBalls.js';

class Utilities extends React.Component {
    constructor(props){
        super(props);
        this.state = { showHelices:true, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showBVals: false, showDensityFit: false, showRotamers: false, showRotamerModal:false, showRamaBalls: false, rotamerText:""};
    }

    selectionChanged(evt) {
        if(evt.target.value==="generate_helices") {
            this.setState({ showHelices:true, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="prosmart") {
            this.setState({ showHelices:false, showProSMART:true, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="pdb_search") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:true, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="pdb_redo") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:true, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="geometric") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:true, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="download_sf") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:true, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="otherdata") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: true, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="res_bval") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: true, showDensityFit: false, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="density_fit") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: true, showRotamers: false, showRamaBalls: false});
        } else if(evt.target.value==="rotamers") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: true, showRamaBalls: false});
        } else if(evt.target.value==="rama_balls") {
            this.setState({ showHelices:false, showProSMART:false, showPDBSearch:false, showPDB_REDO:false, showMiscObjects:false, showDownloadSF:false, showOtherDataSources: false, showBVals: false, showDensityFit: false, showRotamers: false, showRamaBalls: true});
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

    rotamerClick(rotamerData) {
        let t = rotamerData.restype + " : ";
        for(let irot=0;irot<rotamerData.data.length;irot++){
            t += "(";
            for(let ichi=0;ichi<4;ichi++){
                t += rotamerData.data[irot][ichi] + ", ";
            }
            t += "); ";
        }
        this.setState({rotamerText:t,showRotamerModal:true});
    }

    helicesChanged(data) {
	this.props.helicesChanged({pending:data});
    }

    handleClose(data_id){
        console.log("Close");
        this.setState({showRotamerModal:false});
    }

    render() {

        console.log("render!");

        const handleCloseThis = this.handleClose.bind(this);
        const showModalThis = this.state.showRotamerModal;
        console.log("Show modal",showModalThis);

        const selectionChanged = this.selectionChanged.bind(this);
        const rotamerDataKey = 'rotamers';
        const rotamerCrystMethod = "get_rotamers";
        const rotamerInfoName = "rotamersInfo";
        const bValDataKey = 'bval';
        const bValCrystMethod = "get_bvals";
        const bValInfoName = "bvalInfo";
        const bValDataInfoScaling = 100.;
        const densityFitDataKey = 'density_fit';
        const densityFitCrystMethod = "density_fit";
        const densityFitInfoName = "densityFitInfo";
        const densityFitDataInfoScaling = 1.;

        const keyModal = "modalRotamer";

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
            <option value="density_fit">Density Fit Analysis</option>
            <option value="rotamers">Rotamers</option>
            <option value="rama_balls">Rama balls/Rotamer Dodecs</option>
        </Form.Select>
        { this.state.showHelices ? <Helices onChange={this.helicesChanged.bind(this)} /> : null }
        { this.state.showProSMART ? <ProSMART /> : null }
        { this.state.showPDBSearch ? <PDBSearch onChange={this.filePendingChanged.bind(this)} /> : null }
        { this.state.showPDB_REDO ? <PDB_REDO  mapChange={this.mapChanged.bind(this)} onPDBChange={this.filePendingChanged.bind(this)} /> : null }
        { this.state.showOtherDataSources ? <OtherDataSources  onSVGChange={this.onSVGChange.bind(this)} /> : null }
        { this.state.showMiscObjects ? <MiscObjects /> : null }
        { this.state.showDownloadSF ? <DownloadSF /> : null }
        { this.state.showBVals ? <ResidueData clickHandler={this.props.onResidueDataClick} dataInfoScaling={bValDataInfoScaling} infoName={bValInfoName} crystMethod={bValCrystMethod} dataKey={bValDataKey} ref={this.props.bvalRef} dataObjectsNames={this.props.dataObjectsNames} crystWorker={this.props.crystWorker} /> : null }
        { this.state.showDensityFit ? <ResidueMapData clickHandler={this.props.onResidueDataClick} dataInfoScaling={densityFitDataInfoScaling} infoName={densityFitInfoName} crystMethod={densityFitCrystMethod} dataKey={densityFitDataKey} ref={this.props.densityFitRef} dataObjectsNames={this.props.dataObjectsNames} crystWorker={this.props.crystWorker} /> : null }
        { this.state.showRotamers ? <ResidueList ref={this.props.rotamersRef} infoName={rotamerInfoName} crystMethod={rotamerCrystMethod} dataKey={rotamerDataKey} dataObjectsNames={this.props.dataObjectsNames} crystWorker={this.props.crystWorker} clickHandler={this.rotamerClick.bind(this)} /> : null }
        { this.state.showRamaBalls ? <RamaBalls glRef={this.props.glRef} dataObjectsNames={this.props.dataObjectsNames} crystWorker={this.props.crystWorker} /> : null }

            <Modal key={keyModal} show={showModalThis} onHide={handleCloseThis}>
               <Modal.Header closeButton>
                   <Modal.Title>Rotamers</Modal.Title>
               </Modal.Header>
               <Modal.Body>Rotamer:{this.state.rotamerText}</Modal.Body>
               <Modal.Footer>
                   <Button variant="primary" onClick={handleCloseThis}>
                      Cancel 
                   </Button>
               </Modal.Footer>
            </Modal>
        
        </>

    )
  }
}

export default Utilities;
