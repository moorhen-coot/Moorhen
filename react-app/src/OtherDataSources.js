import React, { Component, createRef, useEffect } from 'react';

import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import {Typeahead} from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';

import configData from "./config.json";

import {parsePDB} from './mgMiniMol.js';

import { guid } from './guid.js';

function splitQuotedCIFString(stringToSplit){
    if(stringToSplit.length===0) return [];
    return stringToSplit.match(/(?:[^\s"]+|"[^"]*")+/g);
}

function getLoop(lines,loopName_in){
    let loopName = loopName_in+".";
    let inWantedLoop = false;
    let loopLines = [];
    let len = lines.length;
    for(let il=0;il<len;il++){
        let l = lines[il].replace(/(^\s+|\s+$)/g,'');
        if(l === "loop_"||(l.substring(0,1)==="_"&&l.substring(0,loopName.length)!==loopName)){
            if(inWantedLoop){
                break;
            }else{
                if(il<lines.length){
                    if(lines[il+1].substring(0,loopName.length) === loopName){
                        inWantedLoop = true;
                    }
                }
            }
        }else{
            if(inWantedLoop){
                loopLines.push(l);
            }
        }
    }
    return loopLines;
}

class OtherDataSources extends Component {

    componentDidMount() {
        var self = this;
        const ligandServer = configData["MONOMER_LIBRARY_SERVER_URL"];
        const theUrl = ligandServer + "/list/mon_lib_list.cif";
        fetch(theUrl).then(response => {
                    return response.text();
                 }).then(function (ligandListCif) {
                const ligandListLines = ligandListCif.split("\n");
                const ligandList = getLoop(ligandListLines,"_chem_comp");
                let ligands = [];
                let libLigandListTypes = [];
                for(let il=0;il<ligandList.length;il++){
                    if(ligandList[il].substr(0,1)==="#"||ligandList[il].trim()===""){
                        continue;
                    } else if(ligandList[il].substr(0,1)==="_"){
                        libLigandListTypes.push(ligandList[il]);
                    } else {
                        ligands.push(ligandList[il]);
                    }
                }
                self.setState({ligands:ligands});
        })
        .catch(function (err) {
                console.error('Aargh, there was an error!', err.statusText);
        });
    }

    constructor(props){
        super(props);
        const self = this;
        this.keyGetSmiles = guid();
        this.keyGetMonomer = guid();
        this.keyAddModalGetSmiles = guid();
        this.keyAddModalGetMonomer = guid();
        this.state = {showModalGetSmiles: false, showModalGetMonomer: false, smilesname:'DRG', smiles:'', monomerid:'', ligands:[]};
        this.myWorkerSMILES = new window.Worker('wasm/smiles_to_pdb_worker.js');
        this.myWorkerSMILES.onmessage = function(e) {
            if(e.data[0]==="result"){
                console.log(e.data[1]);
                self.props.onSVGChange({svg:e.data[1]});
            }
        }
        this.myWorkerGetMonomer = new window.Worker('wasm/monid_to_pdb_worker.js');
        this.myWorkerGetMonomer.onmessage = function(e) {
            if(e.data[0]==="result"){
                self.props.onSVGChange({svg:e.data[1]});
            }
            if(e.data[0]==="pdb"){
                let pdbatoms = parsePDB(e.data[1].split("\n"),"aname");
                self.setState({pending:{fileData:{contents:e.data[1],isPDB:true},atoms:pdbatoms,big:false,name:"aname"}},()=> {self.parametersChanged(); });
                self.setState({theAtoms: pdbatoms});
            }
        }
    }

    handleCloseGetMonomerApplyThis(){
        this.setState({ showModalGetMonomer: false });
        const monid = splitQuotedCIFString(this.state.monomerid)[0];
        this.myWorkerGetMonomer.postMessage([monid]);
    }

    handleSmilesNameChange(e){
        this.setState({smilesname: e.target.value});
    }

    handleSmilesStringChange(e){
        this.setState({smiles: e.target.value});
    }

    handleMonomerIdChange(e){
        this.setState({monomerid: e.target.value});
    }

    handleCloseGetMonomerCancelThis(){
        this.setState({ showModalGetMonomer: false });
    }

    handleShowGetMonomer(){
        this.setState({ showModalGetMonomer: true });
    }

    handleShowGetSmiles(){
        console.log("handleShowGetSmiles");
        this.setState({ showModalGetSmiles: true });
    }

    setMonomerIdSingleSelections (e) {
        this.state.monomerid = e[0];
    }

    handleCloseGetSmilesApplyThis(){
        console.log(this.state.smilesname);
        console.log(this.state.smiles);
        this.myWorkerSMILES.postMessage([this.state.smiles,this.state.smilesname]);
        //const mol = RDKit.get_mol(this.state.smiles);
        this.setState({ showModalGetSmiles: false });
    }

    handleCloseGetSmilesCancelThis(){
        this.setState({ showModalGetSmiles: false });
    }

    render () {
        const keyGetSmiles = this.keyGetSmiles;
        const keyAddModalGetSmiles = this.keyAddModalGetSmiles;
        const handleShowGetSmiles = this.handleShowGetSmiles.bind(this);
        const handleCloseGetSmilesCancelThis = this.handleCloseGetSmilesCancelThis.bind(this);
        const handleCloseGetSmilesApplyThis = this.handleCloseGetSmilesApplyThis.bind(this);
        const showModalGetSmiles = this.state.showModalGetSmiles;

        const keyGetMonomer = this.keyGetMonomer;
        const keyAddModalGetMonomer = this.keyAddModalGetMonomer;
        const handleShowGetMonomer = this.handleShowGetMonomer.bind(this);
        const handleCloseGetMonomerCancelThis = this.handleCloseGetMonomerCancelThis.bind(this);
        const handleCloseGetMonomerApplyThis = this.handleCloseGetMonomerApplyThis.bind(this);
        const showModalGetMonomer = this.state.showModalGetMonomer;

        const handleSmilesNameChange = this.handleSmilesNameChange.bind(this);
        const handleSmilesStringChange = this.handleSmilesStringChange.bind(this);
        const handleMonomerIdChange = this.handleMonomerIdChange.bind(this);
        const setMonomerIdSingleSelections = this.setMonomerIdSingleSelections.bind(this);

        let modals = [];
        modals.push(
            <Modal key={keyAddModalGetSmiles} show={showModalGetSmiles} onHide={handleCloseGetSmilesCancelThis}>
               <Modal.Header closeButton>
                   <Modal.Title>Generate structure from SMILES string</Modal.Title>
               </Modal.Header>
               <Modal.Body>Generate structure from SMILES string (this does not work yet!)
                  <h4>Molecule name</h4>
                  <Form.Control type="text" value={this.state.smilesname} placeholder="DRG" onChange={handleSmilesNameChange}/>
                  <h4>SMILES string</h4>
                  <Form.Control as="textarea" rows={6} value={this.state.smiles} onChange={handleSmilesStringChange}/>
               </Modal.Body>
               <Modal.Footer>
                   <Button variant="primary" onClick={handleCloseGetSmilesApplyThis}>
                      Generate molecule 
                   </Button>
                   <Button variant="secondary" onClick={handleCloseGetSmilesCancelThis}>
                      Cancel 
                   </Button>
               </Modal.Footer>
            </Modal>
               );
        modals.push(
            <Modal key={keyAddModalGetMonomer} show={showModalGetMonomer} onHide={handleCloseGetMonomerCancelThis}>
               <Modal.Header closeButton>
                   <Modal.Title>Generate structure from monomer id</Modal.Title>
               </Modal.Header>
               <Modal.Body>Generate structure from monomer id (this does not work yet!)
                  <h4>Monomer id</h4>
                  {/*
                  <Form.Control type="text" value={this.state.monomerid} onChange={handleMonomerIdChange}/>
                  */}
                  <Typeahead
                    id="basic-typeahead-single"
                    onChange={setMonomerIdSingleSelections}
                    options={this.state.ligands}
                    placeholder="Start typing monomer name or description..."
                  />
               </Modal.Body>
               <Modal.Footer>
                   <Button variant="primary" onClick={handleCloseGetMonomerApplyThis}>
                      Get monomer 
                   </Button>
                   <Button variant="secondary" onClick={handleCloseGetMonomerCancelThis}>
                      Cancel 
                   </Button>
               </Modal.Footer>
            </Modal>
               );
        return (<>
        <Table>
        <tbody>
        <tr>
            <td key={keyGetSmiles}><Button variant="primary" size="sm" onClick={handleShowGetSmiles}>Generate Structure from SMILES</Button></td>
            <td key={keyGetMonomer}><Button variant="primary" size="sm" onClick={handleShowGetMonomer}>Get Monomer</Button></td>
        </tr>
        </tbody>
        </Table>
        {modals}
        </>
        
        );
    }
}

export default OtherDataSources;
