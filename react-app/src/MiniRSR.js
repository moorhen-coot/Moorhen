import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import { guid } from './guid.js';

class MiniRSR extends Component {
    constructor(props) {

        super(props);


        this.preRef = React.createRef();

        this.state = {selected:"unk",mapSelected:"unk",log:""};
        this.jobData = {};
        this.message = "";
        const self = this;
        this.myWorkerRSR = new window.Worker('wasm/mini_rsr_worker.js');

        this.myWorkerRSR.onmessage = function(e) {
            let result = document.getElementById("output");
            if(e.data[0]==="output"){
                self.message += e.data[1] + "\n";
                self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
            }
            if(e.data[0]==="result"){
                //This is then where we decide upon the action
                self.message += e.data[1] + "\n";
                self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
            }
        }
    }

    handleRSR(){
        const self = this;
        const dataFiles = self.props.dataFiles.ids;
        const mapDataFiles = self.props.mapDataFiles.ids;
        const displayData = this.props.displayData;
        const liveUpdatingMaps = this.props.liveUpdatingMaps;
        let key = self.state.selected;
        let keyMap = self.state.mapSelected;
        if(key==="unk"&&displayData.length>0){
            key = displayData[0].id;
        }
        if(keyMap==="unk"&&liveUpdatingMaps.length>0){
            keyMap = liveUpdatingMaps[0].id;
        }
        let rsrInputFileData = null;
        let rsrInputFileName = null;
        console.log(mapDataFiles[keyMap]);
        const jobid = guid();
        this.jobData[jobid] = [];
        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            let name = displayData[iobj].name;
            if(data_id===key){
                this.jobData[jobid].push(data_id);
                rsrInputFileData = dataFiles[key].contents;
                const isPDB = dataFiles[key].isPDB;
                if(isPDB){
                    rsrInputFileName = name+".pdb";
                } else {
                    rsrInputFileName = name+".cif";
                }
                break;
            }
        }
        const rsrInputMapFileData = mapDataFiles[keyMap].contents;
        const rsrInputMapFileName = mapDataFiles[keyMap].name;
        const inputData = {jobId:jobid,pdbinName:rsrInputFileName,pdbinData:rsrInputFileData,hklinName:rsrInputMapFileName,hklinData:rsrInputMapFileData,chainId:"A",resnoStart:27,resnoEnd:37};

        console.log(inputData);
        if(rsrInputFileData){
            self.myWorkerRSR.postMessage(inputData);
        }
    }

    handleChange(evt){
        this.setState({selected:evt.target.value});
    }

    handleMapChange(evt){
        this.setState({mapSelected:evt.target.value});
    }

    render () {
        const styles = reactCSS({
            'default': {
                'logpre': {
                     'margin': '10px',
                     'border': '1px solid green',
                     'height': '200px',
                     'overflowX': 'auto',
                     'overflowY': 'scroll',
                },
                'loggraph': {
                     'margin': '10px',
                     'height': '200px',
                     'overflowX': 'auto',
                     'overflowY': 'scroll',
                },
            },
        });

        const self = this;
        const displayData = this.props.displayData;
        const liveUpdatingMaps = this.props.liveUpdatingMaps;
        const mapDataFiles = this.props.mapDataFiles;

        let rows = [];
        let mapRows = [];
        let handleRSR = this.handleRSR.bind(self);
        let handleChange = this.handleChange.bind(self);
        let handleMapChange = this.handleMapChange.bind(self);
        let selected = this.state.selected;
        let mapSelected = this.state.mapSelected;
        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            let name = displayData[iobj].name;
            let keySup = data_id;
            const keyOption = "rsr_"+keySup;
            rows.push(<option key={keyOption} value={keySup}>{name}</option>);
        }
        if(selected==="unk"&&displayData.length>0){
            selected = displayData[0].id;
        }

        const mtzRegex = /.mtz$/;
        for(let imap=0;imap<liveUpdatingMaps.length;imap++){
            const value = liveUpdatingMaps[imap];
            if(value.theseBuffers && value.theseBuffers.length>0){
                const key = value.id;
                const keyOption = "rsr_"+key;
                const shortName = mapDataFiles.ids[key].name.replace(mtzRegex,"");
                mapRows.push(<option key={keyOption} value={key}>{shortName}</option>);
            }
        }

        return (
                <>
        <Form>
        <Form.Group as={Row} controlId="getnormalmodes">
        <Col>
                <Form.Select value={selected} onChange={handleChange} >
                {rows}
                </Form.Select>
        </Col>
        <Col>
                <Form.Select value={mapSelected} onChange={handleMapChange} >
                {mapRows}
                </Form.Select>
        </Col>
        <Col>
                <Button size="sm" onClick={handleRSR}>Calculate</Button>
        </Col>
        </Form.Group>
        </Form>
                <div className="vspace1em"></div>
                <pre ref={this.preRef} style={styles.logpre}>
                {this.state.log}
                </pre>
            </>
        );
    }
}
export default MiniRSR;
