import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';

import { guid } from './guid.js';

class FlipPeptide extends Component {
    constructor(props) {

        super(props);


        this.preRef = React.createRef();

        this.state = {selected:"unk",mapSelected:"unk",log:"", chainId:"", flipRes:0 };
        this.jobData = {};
        this.message = "";
        const self = this;
    }

    updateLog(s){
        const self = this;
        self.message += s;
        self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
    }

    handleFlip(){
        const self = this;
        let key = self.state.selected;
        const dataObjectNames = this.getDataObjectNamesFromSharedArrayBuffer(this.props.sharedArrayBuffer);
        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        if(pdbKeys.length<1){
            return;
        }
        if(key==="unk"){
            key = pdbKeys[0];
        }
        const jobid = guid();
        const inputData = {method:"flip_peptide",jobId:jobid,pdbinKey:key,chainId:this.state.chainId,resnoFlip:parseInt(this.state.flipRes)};
        self.props.crystWorker.postMessage(inputData);
    }

    handleChange(evt){
        this.setState({selected:evt.target.value});
    }

    handleChainChange(evt){
        this.setState({chainId:evt.target.value});
    }

    handeleFlipNoChange(evt){
        this.setState({flipRes:evt.target.value});
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
        let handleFlip = this.handleFlip.bind(self);
        let handleChange = this.handleChange.bind(self);
        let selected = this.state.selected;

        const pdbRegex = /.pdb$/;
        const entRegex = /.ent$/;

        const dataObjectNames = this.getDataObjectNamesFromSharedArrayBuffer(this.props.sharedArrayBuffer);

        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        for(let iobj=0;iobj<pdbKeys.length;iobj++){
            const data_id = pdbKeys[iobj];
            const name = dataObjectNames.pdbFiles[data_id].originalFileName;
            const keySup = data_id;
            const keyOption = "rsr_"+keySup;
            const shortName = name.replace(pdbRegex,"");
            rows.push(<option key={keyOption} value={keySup}>{shortName}</option>);
        }

        return (
                <>
        <Form>
        <Form.Group as={Row} controlId="flippep1">
        <Col>
                <Form.Select value={selected} onChange={handleChange} >
                {rows}
                </Form.Select>
        </Col>
        <Col>
                <Button size="sm" onClick={handleFlip}>Flip</Button>
        </Col>
        </Form.Group>
        <Form.Group as={Row} controlId="flippep2">
        <Col>
        <Form.Control required type="text" onChange={this.handleChainChange.bind(this)} placeholder="Chain id" value={this.state.chainId} />
        </Col>
        <Col>
        <Form.Control required type="number" onChange={this.handeleFlipNoChange.bind(this)} placeholder="Residue" value={this.state.flipRes} />
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
export default FlipPeptide;
