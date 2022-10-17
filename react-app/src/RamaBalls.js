import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';

import { guid } from './guid.js';

class RamaBalls extends Component {
    constructor(props) {

        super(props);

        this.state = {selected:"unk",log:"", chainId:"", plotInfo: null};
        this.message = "";
        const self = this;
    }


    /**
     * Handle model name change by updating widget state
     * @param {Event} evt 
     */
    handleChange(evt){
        const self = this;
        this.setState({selected:evt.target.value}, ()=> self.getRama());
    }


    handleSubmit(evt){
        evt.preventDefault();
    }

    /**
     * Sends a message to crystallography worker as a promise
     * @param {Worker} crystWorker 
     * @param {Object} kwargs 
     */
     postCrystWorkerMessage(crystWorker, kwargs) {
        const messageId = guid();
        return new Promise((resolve, reject) => {
            const messageListener = crystWorker.addEventListener('message', (e) => {
                if (e.data.messageId === messageId) {
                    crystWorker.removeEventListener('message', messageListener);
                    resolve(e);
                }
            })
            crystWorker.postMessage({
                messageId, ...kwargs
            });
        });
    }    

    /**
     * Get ramachandran balls and send message with result to crystallography worker
     */
    async getRama(){
        const self = this;
        let key = self.state.selected;
        const dataObjectNames = this.props.dataObjectsNames;
        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        if(pdbKeys.length<1){
            return;
        }
        if(key==="unk"){
            key = pdbKeys[0];
        }
        const jobid = guid();
        const inputData = {method:"rama_balls",jobId:jobid,pdbinKey:key,chainId:this.state.chainId};
        let response = await this.postCrystWorkerMessage(self.props.crystWorker, inputData);
        this.props.glRef.current.appendOtherData(response.data.result,false,"RamaBalls")
        const inputData2 = {method:"rotamer_dodecs",jobId:jobid,pdbinKey:key,chainId:this.state.chainId};
        let response2 = await this.postCrystWorkerMessage(self.props.crystWorker, inputData2);
        this.props.glRef.current.appendOtherData(response2.data.result,false,"RamaBalls")
        
    }

    /**
     * Handle chain name change by updating widget state
     * @param {Event} evt 
     */
    handleChainChange(evt){
        const self = this;
        //TODO - calling getRama should be more sane ?
        this.setState({chainId:evt.target.value}, ()=> self.getRama());
    }

    /**
     * Renders widget in html format
     * @returns {string} - html contents with the rendered widget
     */
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

        let rows = [];
        let selected = this.state.selected;
        let handleChange = this.handleChange.bind(self);

        const pdbRegex = /.pdb$/;
        const entRegex = /.ent$/;

        const dataObjectNames = this.props.dataObjectsNames;

        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        for(let iobj=0;iobj<pdbKeys.length;iobj++){
            const data_id = pdbKeys[iobj];
            const name = dataObjectNames.pdbFiles[data_id].originalFileName;
            const keySup = data_id;
            const keyOption = "rsr_"+keySup;
            const shortName = name.replace(pdbRegex,"");
            rows.push(<option key={keyOption} value={keySup}>{shortName}</option>);
        }

        if(selected==="unk"&&pdbKeys.length>0){
            selected = pdbKeys[0];
        }

        //TODO - Need to introspect the pdb file to see what chains exist and pick the first one ...

        return (
                <>
        <Form onSubmit={this.handleSubmit.bind(this)}>
        <Form.Group as={Row} controlId="rama">
        <Col>
                <Form.Select value={selected} onChange={handleChange} >
                {rows}
                </Form.Select>
        </Col>
        <Col>
        <Form.Control required type="text" onChange={this.handleChainChange.bind(this)} placeholder="Chain id" value={this.state.chainId} />
        </Col>
        </Form.Group>
        </Form>
        </>
        );
    }
}
export default RamaBalls;
