import React, { Component, createRef } from 'react';

import Table from 'react-bootstrap/Table';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import StructureTreeView from './StructureTreeView';

import SketchDT from './SketchDT';

import {colourStyles,displayStyles} from './mgWebGLAtomsToPrimitives.js';

class DisplayTable extends Component {
    constructor(props) {
        super(props);
        this.state = {treeSelection:{ids:{}}, customColour:{ids:{}}, colourBrowserSelection:{ids:{}}, showAddModal:{ids:{}},showModal:{ids:{}},styleSelection:{ids:{}},newObjectSelection:"all"};
        this.treeCache = {};
    }

    closeDataId(evt,data_id,name,self){
        this.setState({showAddModal:{ids:{}},showModal:{ids:{}}});
        this.props.deleteRequest(data_id);
    }

    visibilityChanged(evt,idsRibbons,self) {
        this.props.visibilityChanged({visible:evt.target.checked,bufferIds:idsRibbons});
    }

    handleShowAdd(data_id){
        const changedIds = { ...this.state.showAddModal.ids, [data_id] : true };
        const newIds = { ...this.state.showAddModal, ids : changedIds };
        this.setState({ showAddModal: newIds });
    }

    handleShow(data_id){
        const changedIds = { ...this.state.showModal.ids, [data_id] : true };
        const newIds = { ...this.state.showModal, ids : changedIds };
        this.setState({ showModal: newIds });
    }

    handleClose(data_id){
        this.setState({showModal:{ids:{}}});
    }

    handleCloseAdd(data_id){
        this.setState({showAddModal:{ids:{}}});
    }

    treeChanged(evt,stuff,data_id) {
        const changedIds = { ...this.state.treeSelection.ids, [data_id] : evt };
        const newIds = { ...this.state.treeSelection, ids : changedIds };
        this.setState({ treeSelection: newIds});
    }

    customColorChanged(evt,stuff,data_id) {
        var self = this;
        const changedIds = { ...this.state.customColour.ids, [data_id] : evt };
        const newIds = { ...this.state.customColour, ids : changedIds };
        this.setState({ customColour: newIds});
    }

    handleCloseAddCancel(data_id){
        this.setState({showAddModal:{ids:{}}});
    }

    reducedKeySet(keys){

        let reduced = {};

        for(let ik=0;ik<keys.length;ik++){
            let split = keys[ik].split("-");
            if(split[0] in reduced){
                continue;
            }
            if(split.length>1){
                if(split[0]+"-"+split[1] in reduced){
                    continue;
                }
            }
            if(split.length>2){
                if(split[0]+"-"+split[1]+"-"+split[2] in reduced){
                    continue;
                }
            }
            if(split.length>3){
                if(split[0]+"-"+split[1]+"-"+split[2]+"-"+split[3] in reduced){
                    continue;
                }
            }
            reduced[keys[ik]] = keys[ik];
        }

        return Object.keys(reduced);
    }

    accumSel(sels){
        //This takes things like ['A/1','A/2',....,'A/45','A/47'] and turns it into 'A/1-45 or A/47'
        let sels2 = [];
        let accum = "";
        let prev_chain = "";
        let prev = -999;

        for(let isel=0;isel<sels.length;isel++){
            let sel = sels[isel];
            let sel_split = sel.split("/");

            if((sel_split.length!=2)||(sel_split[1].length===0)){
                prev_chain = sel_split[0];
                if(accum.split(",").length>1){
                    sels2.push(accum.split(",")[0]+"-"+accum.split(",")[accum.split(",").length-1]);
                }else if(accum.length>0){
                    sels2.push(accum);
                }
                accum = sel;
                prev = -999;
                continue;
            }

            let v = parseInt(sel_split[1]);
            if(accum === ""){
                accum = sel;
                prev = v;
            } else {
                if((v - prev === 1)&&(sel_split[0] === prev_chain)){
                    accum += ","+v;
                    prev = v;
                } else {
                    if(accum.split(",").length>1){
                        sels2.push(accum.split(",")[0]+"-"+accum.split(",")[accum.split(",").length-1]);
                    } else {
                        sels2.push(accum);
                    }
                    accum = sel;
                    prev = v;
                }
            }
            prev_chain = sel_split[0];
        }

        if(accum.length>0){
            if(accum.split(",").length>1){
                sels2.push(accum.split(",")[0]+"-"+accum.split(",")[accum.split(",").length-1]);
            } else {
                sels2.push(accum);
            }
        }

        if(sels2.length>1){
            return sels2.join(" or ");
        } else if(sels2.length>0){
            return sels2[0];
        } else {
            return "";
        }

    }

    handleCloseAddApply(data_id,ncustom){
        var atoms = "all";
        var colour = Object.keys(colourStyles)[0];
        var style = Object.keys(displayStyles)[0];
        if(this.state.colourBrowserSelection.ids[data_id]){
            colour = this.state.colourBrowserSelection.ids[data_id].split("_")[1];
            if(colour==="COLOURBROWSER"){
                let r = this.state.customColour.ids[data_id].r.toString(16);
                let g = this.state.customColour.ids[data_id].g.toString(16);
                let b = this.state.customColour.ids[data_id].b.toString(16);
                if(r.length==1) r = "0"+r;
                if(g.length==1) g = "0"+g;
                if(b.length==1) b = "0"+b;
                colour = "#"+r+g+b;
            }
        }
        if(this.state.styleSelection.ids[data_id]){
            style = this.state.styleSelection.ids[data_id].split("_")[1];
        }
        if(this.state.treeSelection.ids[data_id]){
            let reducedKeys = this.reducedKeySet(this.state.treeSelection.ids[data_id].checkedKeys);
            let selection = this.reducedKeysToSelection(this.treeCache[data_id],reducedKeys);
            selection = this.accumSel(selection);
            atoms = selection;
        }
        this.setState({showAddModal:{ids:{}}});
        this.props.addRequest({"data_id":data_id,"selection":atoms,"colour":colour,"style":style,"ncustom":ncustom});
    }

    reducedKeysToSelection(tree,keys){
        let selection = [];
        for(let im=0;im<tree.length;im++){
            let model = tree[im];
            if(keys.indexOf(model.key)>-1){
                selection.push(model.selection);
                continue;
            }
            for(let ic=0;ic<model.children.length;ic++){
                let chain = model.children[ic];
                if(keys.indexOf(chain.key)>-1){
                    selection.push(chain.selection);
                    continue;
                }
                for(let ir=0;ir<chain.children.length;ir++){
                    let res = chain.children[ir];
                    if(keys.indexOf(res.key)>-1){
                        selection.push(res.selection);
                        continue;
                    }
                    for(let ia=0;ia<res.children.length;ia++){
                        let atom = res.children[ia];
                        if(keys.indexOf(atom.key)>-1){
                            selection.push(atom.selection);
                        }
                    }
                }
            }
        }
        return selection;
    }

    makeStructureTree(atoms,name){
        //First model for starters?
        let firstModel = atoms.atoms[0];
        let treeData = [{key:'0',selection:"all",title:name,children:[]}];
        let chains = firstModel.chains;
        for(let ic=0;ic<chains.length;ic++){
            let chainChild = {key:'0-'+ic,selection:chains[ic].getChainID()+"/",title:chains[ic].getChainID(),children:[]};
            treeData[0].children.push(chainChild);
            let residues = chains[ic].residues;
            for(let ir=0;ir<residues.length;ir++){
                let residueChild = {key:'0-'+ic+'-'+ir,selection:chains[ic].getChainID()+"/"+residues[ir].getSeqIDAuth(),title:residues[ir].getSeqIDAuth()+"("+residues[ir].getName()+")",children:[]};
                chainChild.children.push(residueChild);
                let atoms = residues[ir].atoms;
                for(let ia=0;ia<atoms.length;ia++){
                    let atomID = "?";
                    let altLoc = "";
                    if(atoms[ia]["_atom_site.label_atom_id"]){
                        atomID = atoms[ia]["_atom_site.label_atom_id"];
                    }
                    if(atoms[ia]["_atom_site.label_alt_id"]&&atoms[ia]["_atom_site.label_alt_id"]!=="."&&atoms[ia]["_atom_site.label_alt_id"]!=="?"){
                        altLoc = ":"+atoms[ia]["_atom_site.label_alt_id"];
                    }
                    let atomChild = {key:'0-'+ic+'-'+ir+'-'+ia,selection:chains[ic].getChainID()+"/"+residues[ir].getSeqIDAuth()+"/"+atomID+altLoc,title:atomID+altLoc,children:[]};
                    residueChild.children.push(atomChild);
                }
            }
        }
        return treeData;
    }

    handleColourSelect (e) {
        var self = this;
        //console.log(e.target.value);
        let split = e.target.value.split("_");
        //console.log(split);
        const changedIds = { ...this.state.colourBrowserSelection.ids, [split[0]] : e.target.value };
        const newIds = { ...this.state.colourBrowserSelection, ids : changedIds };
        this.setState({colourBrowserSelection:newIds});
    }

    handleStyleSelect (e) {
        var self = this;
        console.log(e.target.value);
        let split = e.target.value.split("_");
        console.log(split);
        const changedIds = { ...this.state.styleSelection.ids, [split[0]] : e.target.value };
        const newIds = { ...this.state.styleSelection, ids : changedIds };
        this.setState({styleSelection:newIds});
    }

    render () {
        var self = this;
        const displayData = this.props.displayData;
        const liveUpdatingMaps = this.props.liveUpdatingMaps;
        const mapDataFiles = this.props.mapDataFiles;
        let rows = [];
        let maprows = [];
        let modals = [];
        var showModal = this.state.showModal;
        var showAddModal = this.state.showAddModal;

        const mtzRegex = /.mtz$/;
        let maxCustom = 0;

        for(let imap=0;imap<liveUpdatingMaps.length;imap++){
            const value = liveUpdatingMaps[imap];
            if(value.theseBuffers && value.theseBuffers.length>0){
                let idsMaps = [];
                const key = value.id;
                let showModalThis;
                const handleCloseThis = this.handleClose.bind(self,key);
                try{
                    showModalThis = self.state.showModal.ids[key];
                } catch(e) {
                    showModalThis = false;
                }
                const keyModal = "modal"+key;

                const shortName = mapDataFiles.ids[key].name.replace(mtzRegex,"");
                modals.push(
                        <Modal key={keyModal} show={showModalThis} onHide={handleCloseThis}>
                        <Modal.Header closeButton>
                        <Modal.Title>Close data file {shortName}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>Really close data file {shortName} ?</Modal.Body>
                        <Modal.Footer>
                        <Button variant="secondary" onClick={function(evt){self.closeDataId(evt,key,shortName,self)}}>
                        Close data {shortName}
                        </Button>
                        <Button variant="primary" onClick={handleCloseThis}>
                        Cancel 
                        </Button>
                        </Modal.Footer>
                        </Modal>
                );

                const dtRowKey = "displayTableMapRow_"+key;
                const keyMap = "displayTableMapRow_"+key+"_1";
                const keyDelete = "deleteMap"+key;
                let handleShowMap = this.handleShow.bind(self,key);
                for(let ibuf=0;ibuf<value.theseBuffers.length;ibuf++){
                    idsMaps.push(value.theseBuffers[ibuf].id);
                }
                maprows.push(<tr key={dtRowKey}><td>{shortName}</td><td key={keyMap}><input type="checkbox" defaultChecked={value.theseBuffers[0].visible} onChange={function(evt){self.visibilityChanged(evt,idsMaps,self)}} /></td><td key={keyDelete}><Button size="sm" onClick={handleShowMap}>Close</Button></td></tr>);
            }
        }


        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            let customBuffers = {};
            let thisMaxCustom = 0;
            for(let ibuf=0;ibuf<displayData[iobj].buffers.length;ibuf++){
                if(displayData[iobj].buffers[ibuf].display_class.startsWith("custom")){
                    if(!(displayData[iobj].buffers[ibuf].display_class+"_"+data_id in customBuffers)){
                        customBuffers[displayData[iobj].buffers[ibuf].display_class+"_"+data_id] = [];
                        thisMaxCustom++;
                    }
                    customBuffers[displayData[iobj].buffers[ibuf].display_class+"_"+data_id].push(displayData[iobj].buffers[ibuf].id);
                }
            }
            if(thisMaxCustom>maxCustom) maxCustom = thisMaxCustom;
        }
        //console.log("Maximum custom buffers",maxCustom);
        let customHeaders = [];
        for(let ic=0;ic<maxCustom;ic++){
            let val = "C"+(ic+1);
            let key = "customHeader"+ic;
            customHeaders.push(<th key={key}>{val}</th>);
        }

        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            const colourOptions = Object.keys(colourStyles).map((item) => {
                    let key = data_id+"_"+item;
                    return (
                            <option key={key} value={key}>
                            {item}
                            </option>
                           )
                    });
            const styleOptions = Object.keys(displayStyles).map((item) => {
                    let key = data_id+"_"+item;
                    return (
                            <option key={key} value={key}>
                            {item}
                            </option>
                           )
                    });
            let showModalThis;
            let browserKey = data_id+"_COLOURBROWSER";
            //FIXME - may not need exception.
            try{
                showModalThis = self.state.showModal.ids[data_id];
            } catch(e) {
                showModalThis = false;
            }
            let showAddModalThis;
            //FIXME - may not need exception.
            try{
                showAddModalThis = self.state.showAddModal.ids[data_id];
            } catch(e) {
                showAddModalThis = false;
            }
            let selectedStyle = false;
            try{
                selectedStyle = self.state.styleSelection.ids[data_id];
            } catch(e) {
            }
            let selectedColourScheme = false;
            try{
                selectedColourScheme = self.state.colourBrowserSelection.ids[data_id];
            } catch(e) {
            }
            let handleShow = this.handleShow.bind(self,data_id);
            let handleCloseThis = this.handleClose.bind(self,data_id);
            let keyModal = "modal"+data_id;
            let handleShowAdd = this.handleShowAdd.bind(self,data_id);
            let handleCloseAddCancelThis = this.handleCloseAddCancel.bind(self,data_id);
            let keyAddModal = "modalAdd"+data_id;
            let keyDelete = "delete"+data_id;
            let keyAdd = "add"+data_id;
            let keyRibbons = "ribbons_"+data_id;
            let keyBonds = "bonds"+data_id;
            let keyWater = "water"+data_id;
            let keySolute = "solute"+data_id;
            let keyLigands = "ligands"+data_id;
            let keyNeighbourhood = "neighbourhood"+data_id;
            let keyNucleic = "nucleic"+data_id;
            let keyMetal = "metal"+data_id;
            let keyGlyco = "glyco"+data_id;
            let name = displayData[iobj].name;
            let tree = [];
            let customColourSelected = false;
            try {
                let split = selectedColourScheme.split("_");
                if(split[1]==="COLOURBROWSER"){
                    customColourSelected = true;
                }
            } catch(e){
            }
            if(this.treeCache[data_id]){
                tree = this.treeCache[data_id];
            } else {
                tree = this.makeStructureTree(displayData[iobj].atoms,name);
                this.treeCache[data_id] = tree;
            }
            let idsRibbons = [];
            let idsBonds = [];
            let idsWater = [];
            let idsSolute = [];
            let idsLigands = [];
            let idsNeighbourhood = [];
            let idsNucleic = [];
            let idsMetal = [];
            let idsGlyco = [];
            let visRibbons = false;
            let visBonds = false;
            let visWater = false;
            let visSolute = false;
            let visLigands = false;
            let visNeighbourhood = false;
            let visNucleic = false;
            let visMetal = false;
            let visGlyco = false;
            let visCustom = false;
            let custom = [];
            let customBuffers = {};
            let customVis = {};
            for(let ibuf=0;ibuf<displayData[iobj].buffers.length;ibuf++){
                if(displayData[iobj].buffers[ibuf].display_class === "ribbons"){
                    idsRibbons.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visRibbons = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "bonds"){
                    idsBonds.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visBonds = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "water"){
                    idsWater.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visWater = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "solute"){
                    idsSolute.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visSolute = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "ligands"){
                    idsLigands.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visLigands = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "neighbourhood"){
                    idsNeighbourhood.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visNeighbourhood = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "nucleic"){
                    idsNucleic.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visNucleic = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "metal"){
                    idsMetal.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visMetal = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class === "glyco"){
                    idsGlyco.push(displayData[iobj].buffers[ibuf].id);
                    if(displayData[iobj].buffers[ibuf].visible) visGlyco = true;
                }
                if(displayData[iobj].buffers[ibuf].display_class.startsWith("custom")){
                    if(!(displayData[iobj].buffers[ibuf].display_class+"_"+data_id in customBuffers)){
                        customBuffers[displayData[iobj].buffers[ibuf].display_class+"_"+data_id] = [];
                        customVis[displayData[iobj].buffers[ibuf].display_class+"_"+data_id] = displayData[iobj].buffers[ibuf].visible;
                    }
                    customBuffers[displayData[iobj].buffers[ibuf].display_class+"_"+data_id].push(displayData[iobj].buffers[ibuf].id);
                }
            }
            for (const [keyCustom, idsCustom] of Object.entries(customBuffers)) {
                let customVisThis = customVis[keyCustom];
                custom.push(<td key={keyCustom}><input type="checkbox" defaultChecked={customVisThis} onChange={function(evt){self.visibilityChanged(evt,idsCustom,self)}}/></td>);
            }
            //console.log(Object.keys(customBuffers).length,maxCustom);
            if(Object.keys(customBuffers).length<maxCustom){
                let cdiff = maxCustom - Object.keys(customBuffers).length;
                let disabled = true;
                let checked = false;
                for(let icdum=0;icdum<cdiff;icdum++){
                    let keyCustom = "dummyCustom_"+icdum+"_"+data_id;
                    custom.push(<td key={keyCustom}><input type="checkbox" disabled={disabled} defaultChecked={checked} /></td>);
                }
            }
            let handleCloseAddApplyThis = this.handleCloseAddApply.bind(self,data_id,Object.keys(customBuffers).length);
            let noRibbons = true;
            let noLigands = true;
            let noNeighbourhood = true;
            let noSolute = true;
            let noWater = true;
            let noNucleic = true;
            let noMetal = true;
            let noGlyco = true;
            let noBonds = true;
            if(idsRibbons.length>0){
                noRibbons = false;
            }
            if(idsLigands.length>0){
                noLigands = false;
            }
            if(idsNeighbourhood.length>0){
                noNeighbourhood = false;
            }
            if(idsSolute.length>0){
                noSolute = false;
            }
            if(idsWater.length>0){
                noWater = false;
            }
            if(idsNucleic.length>0){
                noNucleic = false;
            }
            if(idsMetal.length>0){
                noMetal = false;
            }
            if(idsGlyco.length>0){
                noGlyco = false;
            }
            if(idsBonds.length>0){
                noBonds = false;
            }
            const dtRowKey = "displayTableRow_"+iobj;
            rows.push(<tr key={dtRowKey}><td>{name}</td>
            <td key={keyRibbons}><input type="checkbox" disabled={noRibbons} defaultChecked={visRibbons} onChange={function(evt){self.visibilityChanged(evt,idsRibbons,self)}} /></td>
            <td key={keyLigands}><input type="checkbox" disabled={noLigands} defaultChecked={visLigands} onChange={function(evt){self.visibilityChanged(evt,idsLigands,self)}}/></td>
            <td key={keyNeighbourhood}><input type="checkbox" disabled={noNeighbourhood} defaultChecked={visNeighbourhood} onChange={function(evt){self.visibilityChanged(evt,idsNeighbourhood,self)}}/></td>
            <td key={keySolute}><input type="checkbox" disabled={noSolute} defaultChecked={visSolute} onChange={function(evt){self.visibilityChanged(evt,idsSolute,self)}}/></td>
            <td key={keyWater}><input type="checkbox" disabled={noWater} defaultChecked={visWater} onChange={function(evt){self.visibilityChanged(evt,idsWater,self)}}/></td>
            <td key={keyNucleic}><input type="checkbox" disabled={noNucleic} defaultChecked={visNucleic} onChange={function(evt){self.visibilityChanged(evt,idsNucleic,self)}}/></td>
            <td key={keyMetal}><input type="checkbox" disabled={noMetal} defaultChecked={visMetal} onChange={function(evt){self.visibilityChanged(evt,idsMetal,self)}}/></td>
            <td key={keyGlyco}><input type="checkbox" disabled={noGlyco} defaultChecked={visGlyco} onChange={function(evt){self.visibilityChanged(evt,idsGlyco,self)}}/></td>
            <td key={keyBonds}><input type="checkbox" disabled={noBonds} defaultChecked={visBonds} onChange={function(evt){self.visibilityChanged(evt,idsBonds,self)}}/></td>
            {custom}
            <td key={keyAdd}><Button size="sm" onClick={handleShowAdd}>+</Button></td>
            <td key={keyDelete}><Button size="sm" onClick={handleShow}>Close</Button></td>
            </tr>
            );
            modals.push(
            <Modal key={keyAddModal} show={showAddModalThis} onHide={handleCloseAddCancelThis}>
               <Modal.Header closeButton>
                   <Modal.Title>Add a new display object</Modal.Title>
               </Modal.Header>
               <Modal.Body>
                  <h4>Select atoms</h4>
                  <StructureTreeView onChange={function(evt){self.treeChanged(evt,self,data_id)}} treeData={tree}/>
                  <h4>Colour</h4>
                   <Form.Group>
                   <Form.Select aria-label="Colour" onChange={this.handleColourSelect.bind(this)} value={selectedColourScheme}>
                   {colourOptions}
                   <option key={browserKey} value={browserKey}>Choose specific colour</option>
                   </Form.Select>
                   {customColourSelected && <SketchDT onChange={function(evt){self.customColorChanged(evt,self,data_id)}}/>}
                   </Form.Group>
                  <h4>Style</h4>
                   <Form.Select aria-label="Style" onChange={this.handleStyleSelect.bind(this)} value={selectedStyle}>
                   {styleOptions}
                   </Form.Select>
               </Modal.Body>
               <Modal.Footer>
                   <Button variant="primary" onClick={handleCloseAddApplyThis}>
                      Add 
                   </Button>
                   <Button variant="secondary" onClick={handleCloseAddCancelThis}>
                      Cancel 
                   </Button>
               </Modal.Footer>
            </Modal>
            );
            modals.push(
            <Modal key={keyModal} show={showModalThis} onHide={handleCloseThis}>
               <Modal.Header closeButton>
                   <Modal.Title>Close data file {name}</Modal.Title>
               </Modal.Header>
               <Modal.Body>Really close data file {name} ?</Modal.Body>
               <Modal.Footer>
                   <Button variant="secondary" onClick={function(evt){self.closeDataId(evt,data_id,name,self)}}>
                       Close data {name}
                   </Button>
                   <Button variant="primary" onClick={handleCloseThis}>
                      Cancel 
                   </Button>
               </Modal.Footer>
            </Modal>
            );
        }
        return (
                <>
                <h4 className='mb-3'>Models</h4>
                <Table responsive>
                <thead key="displayTableKey"><tr><th key="structName"></th><th key="R">R</th><th key="L">L</th><th key="N">N</th><th key="S">S</th><th key="W">W</th><th key="Nu">Nu</th><th key="M">M</th><th key="G">G</th><th key="B">B</th>{customHeaders}<th key="add"></th><th key="delete"></th></tr></thead>
                <tbody>
                {rows}
                </tbody>
                </Table>
                <hr/>
                <h4 className='mb-3'>Maps</h4>
                <Table>
                <tbody>
                {maprows}
                </tbody>
                </Table>
                {modals}
            </>
        );
    }
}
export default DisplayTable;
