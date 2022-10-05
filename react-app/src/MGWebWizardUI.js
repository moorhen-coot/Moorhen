import React, { Component, createRef, useEffect } from 'react';

import Table from 'react-bootstrap/Table';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import {Typeahead} from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';


import pako from 'pako';
import {parseMMCIF,parsePDB,isAminoAcidType,isWaterType} from './mgMiniMol.js';

import {wizards} from './mgWizard.js';

import configData from "./config.json";

import ColoredLine from './ColoredLine.js';

import { guid } from './guid.js';

import {readMapFromArrayBuffer,mapToMapGrid} from './mgWebGLReadMap.js';

const Spacer = props => {
  return (
    <div style={{height:props.height}}></div>
  );
}

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

function makeRequest (method, url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

class MGWebWizardUI extends Component {

    parametersChanged() {
        //FIXME - load new file should not delete existing files; change of wizard should delete buffers associated with that file.
        console.log(this.state.pending);
        var pending;
        if(!this.state.pending) return;
        if(this.state.pending.big){
            pending = {fileData:this.state.pending.fileData,atoms:this.state.pending.atoms,wizard:"Bonds",name:this.state.pending.name};
        } else {
            pending = {fileData:this.state.pending.fileData,atoms:this.state.pending.atoms,wizard:this.state.wizard,name:this.state.pending.name};
        }
        try {
            this.props.onChange(pending);
        } catch(e) {
            console.log("Fail");
            console.log(e);
            //Ignore
        }
    }
    constructor(props){
        super(props);
        this.state = {pdbcode:'',wizard:'Bonds', theAtoms : [], ligands:[]};
        this.enerLib = this.props.enerLib;
        this.inputRef = createRef();
        this.cifinputRef = createRef();
        this.myWorkerPDB = new window.Worker('wasm/pdb_worker.js');
        var self = this;

        this.myWorkerPDB.onmessage = function(e) {
            if(e.data[0]==="output"){
                //console.log(e.data[1]);
            }
            if(e.data[0]==="result"){
                self.props.onSVGChange({svg:e.data[1]});
            }
            if(e.data[0]==="glycan_result"){
                self.props.onGlycanChange({glycans:e.data[1]});
            }
        }
        this.myWorkerMTZ = new window.Worker('wasm/mtz_arraybuffer_worker.js');
        this.myWorkerMTZ.onmessage = function(e) {
            const result = document.getElementById("output");
            if(e.data[0]==="output"){
                console.log(e.data[1]);
            }
            if(e.data[0]==="result"){
                let ccp4map = e.data[1];

                const map = readMapFromArrayBuffer(ccp4map.buffer);
                const mapGrid = mapToMapGrid(map);
                const mapTriangleData = {"mapGrids":[mapGrid],"col_tri":[[]], "norm_tri":[[]], "vert_tri":[[]], "idx_tri":[[]] , "prim_types":[[]] };
                console.log(mapTriangleData);

                if(e.data[2]){
                    self.props.mapChanged({mapTriangleData:mapTriangleData,name:e.data[2],contents:e.data[3]});
                } else {
                    self.props.mapChanged({mapTriangleData:mapTriangleData,name:"unknown",contents:e.data[3]});
                }
            }
        }
    }

    componentDidMount() {
        var self = this;
        const ligandServer = configData["MONOMER_LIBRARY_SERVER_URL"];
        const theUrl = ligandServer + "/list/mon_lib_list.cif";
        makeRequest('GET',theUrl , true).then(function (ligandListCif) {
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
                        /*
                        //Not sure we need the data structured - strings will do for my purposes as long as first one is id?
                        let split = splitQuotedCIFString(ligandList[il]);
                        if(split[0]!=="."){
                            let atom = {};
                            for(let iprop=0;iprop<split.length;iprop++){
                                atom[libLigandListTypes[iprop]] = split[iprop];
                            }
                            ligands.push(atom);
                        }
                        */
                    }
                }
                self.setState({ligands:ligands});
        })
        .catch(function (err) {
                console.error('Aargh, there was an error!', err.statusText);
        });
    }

    loadPdb(){
        console.log("Load PDB (and dicts)");
        var self = this;
        self.props.crystWorker.postMessage({method:"loadFile",files:this.inputRef.current.files});
        function uploadCIF(file) {
            if(file.files.length===0) return;
            for(let fno=0;fno<file.files.length;fno++){
                let f = file.files[fno];
                let r = new FileReader();
                r.onload = function(e) { 
                    var contents = e.target.result;
                    var ligand = self.enerLib.getMonIDFromCIF(contents);
                    if(ligand){
                        self.enerLib.addCIFAtomTypes(ligand,contents);
                        self.enerLib.addCIFBondTypes(ligand,contents);
                    }
                }
                r.readAsText(f);
            }
        }

        function upload(fileList) {
            for(let i=0; i<fileList.files.length; i++){
                let f = fileList.files[i];
                console.log(`Reading file no. ${i+1} out of ${fileList.files.length}`);
                readFile(f);
            }
        }

        function readFile(f) {
            var r = new FileReader();
            var rmtz = new FileReader();
            rmtz.onload = function(e) { 
                const contents = e.target.result;
                console.log(contents);
                self.myWorkerMTZ.postMessage([contents, f.name, "FC_ALL", "PHIC_ALL"]);
            }
            if(f.name.endsWith(".mtz")){
                rmtz.readAsArrayBuffer(f);
                return;
            }
            r.onload = function(e) { 
                var contents = e.target.result;
                var pdbatoms;
                let isPDB = false;
                if(f.name.endsWith(".pdb")||f.name.endsWith(".ent")){
                    pdbatoms = parsePDB(contents.split("\n"),f.name.replace(/\.[^/.]+$/, ""));
                    isPDB = true;
                } else {
                    pdbatoms = parseMMCIF(contents.split("\n"),f.name.replace(/\.[^/.]+$/, ""));
                }
                self.myWorkerPDB.postMessage([contents, f.name]);
                const ligandTypes = pdbatoms["restypes"].filter(word => !isAminoAcidType(word) && !isWaterType(word));
                for(let ilig=0;ilig<ligandTypes.length;ilig++){
                    let ligType = ligandTypes[ilig];
                    let ligandServer = configData["MONOMER_LIBRARY_SERVER_URL"];
                    if(!(ligType in self.enerLib.monLibBonds)){
                        let theUrl = ligandServer+ligType.toLowerCase()[0]+"/"+ligType.toUpperCase()+".cif";
                        console.log("Server",ligandServer);
                        console.log("Getting",theUrl);
                        makeRequest('GET',theUrl,true).then(function (ligandlines) {
                                console.log("Adding",ligType);
                                console.log(ligandlines);
                                self.enerLib.addCIFAtomTypes(ligType,ligandlines);
                                self.enerLib.addCIFBondTypes(ligType,ligandlines);
                                })
                        .catch(function (err) {
                                console.error('Aargh, there was an error!', err.statusText);
                                });
                    }

                }
                self.setState({pending:{fileData:{contents:contents,isPDB:isPDB},atoms:pdbatoms,big:false,name:f.name.substring(0, f.name.lastIndexOf('.'))}},()=> {self.parametersChanged(); });
                self.setState({theAtoms: pdbatoms});
            }
            r.readAsText(f);
        }
        uploadCIF(this.cifinputRef.current);
        upload(this.inputRef.current);
    }

    getLigand(ligand){
        var self = this;
        if(!(ligand in self.enerLib.monLibBonds)){
            console.log("Getting",ligand);
            makeRequest('GET', "https://files.rcsb.org/ligands/download/"+ligand+".cif", true).then(function (ligandlines) {
                    //console.log("Adding",ligand);
                    //console.log(ligandlines);
                    self.enerLib.addCIFAtomTypes(ligand,ligandlines);
                    self.enerLib.addCIFBondTypes(ligand,ligandlines);
                    })
            .catch(function (err) {
                    console.error('Aargh, there was an error!', err.statusText);
                    });
        }
    }
    getPdb(){
        console.log("Get PDB");
        console.log(this.state);
        console.log(this.enerLib);
        var self = this;
        var useGzip = true;
        let mygetrequest=new XMLHttpRequest();
        mygetrequest.onreadystatechange=function(){
            var start = new Date().getTime();
            if (mygetrequest.readyState===4){
                if (mygetrequest.status===200 || window.location.href.indexOf("http")===-1){
                    console.log("Time to get files: "+(new Date().getTime()-start));
                    //console.log(mygetrequest.responseText);

                    var strData = "";
                    if(useGzip){
                        var data  = pako.inflate(mygetrequest.response);
                        console.log("Time to inflate: "+(new Date().getTime()-start));
                        strData = "";

                        if(window.TextDecoder){
                            // THIS'LL only work in Firefox 19+, Opera 25+ and Chrome 38+.
                            var decoder = new TextDecoder('utf-8');
                            strData = decoder.decode(data);
                        } else {
                            var unpackBufferLength = 60000;
                            for(var j=0;j<data.length/unpackBufferLength;j++){
                                var lower = j*unpackBufferLength;
                                var upper = (j+1)*unpackBufferLength;
                                if(upper>data.length){
                                    upper = data.length;
                                }
                                // FECK, no slice on Safari!
                                strData += String.fromCharCode.apply(null, data.subarray(lower,upper));
                            }   
                        }
                    } else {
                        strData = mygetrequest.responseText;
                    }

                    var dataSplit = strData.split("\n");
                    console.log("Time to split data into lines: "+(new Date().getTime()-start));
                    var cifatoms = parseMMCIF(dataSplit,self.state.pdbcode);
                    self.myWorkerPDB.postMessage([strData, self.state.pdbcode+".ent"]);
                    console.log("Time to parse data: "+(new Date().getTime()-start));
                    console.log(cifatoms);
                    console.log(self.enerLib);
                    if(dataSplit.length>100000){
                        self.setState({pending:{fileData:{contents:strData,isPDB:false},atoms:cifatoms,big:true,name:self.state.pdbcode}},()=> {self.parametersChanged(); });
                    } else {
                        self.setState({pending:{fileData:{contents:strData,isPDB:false},atoms:cifatoms,big:false,name:self.state.pdbcode}},()=> {self.parametersChanged(); });
                    }
                    self.setState({theAtoms: cifatoms});
                }
            }
        }
        function getDictsAndCoords(){
            var start = new Date().getTime();
            console.log("Starting download");
            console.log("....");
            var ligandsrequest=new XMLHttpRequest();
            ligandsrequest.onreadystatechange=function(){
                if (ligandsrequest.readyState===4){
                    if (ligandsrequest.status===200 || window.location.href.indexOf("http")===-1){
                        var ligresp = JSON.parse(ligandsrequest.responseText);
                        var ligands = [];
                        if(typeof(ligresp[self.state.pdbcode])!=="undefined"){
                            for(var ilig=0;ilig<ligresp[self.state.pdbcode].length;ilig++){
                                if(typeof(ligresp[self.state.pdbcode][ilig]["chem_comp_id"])!=="undefined"){
                                    if(ligands.indexOf(ligresp[self.state.pdbcode][ilig]["chem_comp_id"])===-1){
                                        ligands.push(ligresp[self.state.pdbcode][ilig]["chem_comp_id"]);
                                    }
                                }
                            }
                        }
                        function getCoordFile(){
                            console.log("getCoordFile");
                            var urlsrequest=new XMLHttpRequest();
                            urlsrequest.onreadystatechange=function(){
                                if (urlsrequest.readyState===4){
                                    if (urlsrequest.status===200 || window.location.href.indexOf("http")===-1){
                                        var resp = JSON.parse(urlsrequest.responseText);
                                        const lowerCode = self.state.pdbcode.toLowerCase();
                                        if(typeof(resp[lowerCode])!=="undefined" && typeof(resp[lowerCode]["PDB"])!=="undefined" && typeof(resp[lowerCode]["PDB"]["downloads"])!=="undefined"){
                                            var dl = resp[lowerCode]["PDB"]["downloads"];
                                            var theUrl = null;
                                            // FIXME use updated  mmcif it has chem comp.
                                            for(var idl=0;idl<dl.length;idl++){
                                                if(typeof(dl[idl]["label"]!=="undefined")&&dl[idl]["label"]==="Archive mmCIF file"&&typeof(dl[idl]["url"]!=="undefined")){
                                                    theUrl = dl[idl]["url"];
                                                    break;
                                                }
                                            }
                                            if(useGzip) theUrl = "https://files.rcsb.org/download/"+self.state.pdbcode.toUpperCase()+".cif.gz";
                                            self.props.crystWorker.postMessage({method:"loadUrl",urls:[theUrl]});
                                            if(theUrl){
                                                mygetrequest.open("GET", theUrl, true);
                                                if(useGzip) mygetrequest.responseType = "arraybuffer";
                                                mygetrequest.send(null);
                                            }
                                        }
                                    }
                                }
                            }
                            urlsrequest.open("GET", "https://www.ebi.ac.uk/pdbe/api/pdb/entry/files/"+self.state.pdbcode, true);
                            urlsrequest.send(null);
                        }
                        console.log("Time to before getLigand: "+(new Date().getTime()-start));
                        if(ligands.length===0){
                            console.log("Time to before getCoordFile: "+(new Date().getTime()-start));
                            getCoordFile();
                        } else {
                            //var chemCompUrl = "https://files.rcsb.org/ligands/download/NEG.cif";
                            for(var il=0;il<ligands.length;il++){
                                console.log("Call getLigand",ligands[il]);
                                self.getLigand(ligands[il]);
                            }
                            getCoordFile();
                        }
                    }
                }
            }
            try {
                ligandsrequest.open("GET", "https://www.ebi.ac.uk/pdbe/api/pdb/entry/ligand_monomers/"+self.state.pdbcode, true);
                ligandsrequest.send(null);
            } catch(e){
                console.log("A problem");
                console.log(e);
            }
        }
        getDictsAndCoords();
    }

    addDictionary(){
        console.log("Add dict");
    }

    handlePdbCodeChange(e){
        this.setState({pdbcode: e.target.value});
    }

    handlePdbFileChange(e){
        this.setState({pdbfile: e.target.value});
    }

    setMonomerIdSingleSelections (e) {
        this.state.monomerid = e[0];
    }

    handleSelect (e) {
        var self = this;
        console.log(e.target.value);
        this.setState({wizard: e.target.value},()=> {self.parametersChanged(); });
    }

    submitHandler (e) {
        e.preventDefault();
        this.getPdb();
    }

    render () {
        const options = Object.keys(wizards).map((item) => {
                return (
                        <option key={item} value={item}>
                        {item}
                        </option>
                       )
                });

        return (<>
        <Form onSubmit={this.submitHandler.bind(this)} >
        <Form.Group as={Row} controlId="getpdb">
        <Col>
        <Form.Control type="text" onChange={this.handlePdbCodeChange.bind(this)} placeholder="PDB code" value={this.state.pdbcode} />
        </Col>
        <Col>
        <Button onClick={this.getPdb.bind(this)}>Get PDB</Button>
        </Col>
        </Form.Group>
        <Spacer height="1rem" />
        <Form.Group controlId="loadpdb">
        <Form.Label>Browse for data file (PDB,mmCIF, MTZ)</Form.Label>
        <Form.Control ref={this.inputRef} type="file" multiple />
        </Form.Group>
        <Spacer height="1rem" />
        <Form.Group controlId="loaddictionary">
        <Form.Label>Dictionary(ies)</Form.Label>
        <Form.Control ref={this.cifinputRef} type="file" multiple />
        </Form.Group>
        <Spacer height="1rem" />
        <Form.Group controlId="loadpdbanddictionaries">
        <Button onClick={this.loadPdb.bind(this)}>Load all files</Button>
        </Form.Group>
        <Spacer height="1rem" />
        <Form.Select aria-label="Default select example" onChange={this.handleSelect.bind(this)}>
        {options}
        </Form.Select>
        </Form>
        </>
        );

    }

    setAtoms(atoms){
        this.theAtoms = atoms;
    }

}

export default MGWebWizardUI;
