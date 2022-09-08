import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';

import { guid } from './guid.js';

class MiniRSR extends Component {
    constructor(props) {

        super(props);


        this.preRef = React.createRef();

        this.state = {selected:"unk",mapSelected:"unk",log:"", chainId:"", startRes:0, endRes:0 };
        this.jobData = {};
        this.message = "";
        const self = this;
    }

    updateLog(s){
        const self = this;
        self.message += s;
        self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
    }

    handleRSR(){
        const self = this;
        let key = self.state.selected;
        let keyMap = self.state.mapSelected;
        const dataObjectNames = this.getDataObjectNamesFromSharedArrayBuffer(this.props.sharedArrayBuffer);
        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        const mtzKeys = Object.keys(dataObjectNames.mtzFiles);
        if(pdbKeys.length<1||mtzKeys.length<1){
            return;
        }
        if(key==="unk"){
            key = pdbKeys[0];
        }
        if(keyMap==="unk"){
            keyMap = mtzKeys[0];
        }
        const jobid = guid();
        const inputData = {method:"mini_rsr",jobId:jobid,pdbinKey:key,hklinKey:keyMap,chainId:this.state.chainId,resnoStart:parseInt(this.state.startRes),resnoEnd:parseInt(this.state.endRes)};
        self.props.crystWorker.postMessage(inputData);
    }

    handleChange(evt){
        this.setState({selected:evt.target.value});
    }

    handleMapChange(evt){
        this.setState({mapSelected:evt.target.value});
    }

    handleChainChange(evt){
        console.log("hello");
        this.setState({chainId:evt.target.value});
    }

    handeleStartNoChange(evt){
        this.setState({startRes:evt.target.value});
    }

    handeleEndNoChange(evt){
        this.setState({endRes:evt.target.value});
    }

    getDataObjectNamesFromSharedArrayBuffer(buffer){

        const view = new Uint8Array(buffer);
        let buflen = 0;
        for(let i=0;i<buffer.byteLength;i++){
            if(view[i] === 0){
                buflen = i;
                break;
            }
        }
        //console.log(buflen);
        const dec = new TextDecoder();
        const stringified = dec.decode(view.slice(0,buflen));
        const dataObjectNames = JSON.parse(stringified);
        return dataObjectNames;

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

        const mtzRegex = /.mtz$/;
        const pdbRegex = /.pdb$/;
        const entRegex = /.ent$/;

        const dataObjectNames = this.getDataObjectNamesFromSharedArrayBuffer(this.props.sharedArrayBuffer);
        //console.log(dataObjectNames);

        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        for(let iobj=0;iobj<pdbKeys.length;iobj++){
            const data_id = pdbKeys[iobj];
            const name = dataObjectNames.pdbFiles[data_id].originalFileName;
            const keySup = data_id;
            const keyOption = "rsr_"+keySup;
            const shortName = name.replace(pdbRegex,"");
            rows.push(<option key={keyOption} value={keySup}>{shortName}</option>);
        }

        const mtzKeys = Object.keys(dataObjectNames.mtzFiles);
        for(let iobj=0;iobj<mtzKeys.length;iobj++){
            const data_id = mtzKeys[iobj];
            const name = dataObjectNames.mtzFiles[data_id].originalFileName;
            const keySup = data_id;
            const keyOption = "rsr_"+keySup;
            const shortName = name.replace(mtzRegex,"");
            mapRows.push(<option key={keyOption} value={keySup}>{shortName}</option>);
        }

        return (
                <>
        <Form>
        <Form.Group as={Row} controlId="minirsr1">
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
        <Form.Group as={Row} controlId="minirsr2">
        <Col>
        <Form.Control required type="text" onChange={this.handleChainChange.bind(this)} placeholder="Chain id" value={this.state.chainId} />
        </Col>
        <Col>
        <Form.Control required type="number" onChange={this.handeleStartNoChange.bind(this)} placeholder="Start residue" value={this.state.startRes} />
        </Col>
        <Col>
        <Form.Control required type="number" onChange={this.handeleEndNoChange.bind(this)} placeholder="End residue" value={this.state.endRes} />
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
