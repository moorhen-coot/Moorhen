import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';

import { guid } from './guid.js';

/**
 * React component to handle flip peptides task
 */
class FlipPeptide extends Component {
    constructor(props) {

        super(props);


        this.preRef = React.createRef();

        this.state = {selected:"unk", mapSelected:"unk", log:"", chainId:"", flipRes:0 };
        this.jobData = {};
        this.message = "";
        const self = this;
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
     * Appends string to message displayed in log box
     * @param {string} s - string with the message that will get logged
     */
    updateLog(s){
        const self = this;
        self.message += s;
        self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
    }

    
    /**
     * Handle the peptide flip and send message with result to crystallography worker
     */
     async handleFlip(){
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
        const inputData = {method:"flip_peptide", jobId:jobid,pdbinKey:key, chainId:this.state.chainId, resnoFlip:parseInt(this.state.flipRes)};
        let response = await this.postCrystWorkerMessage(self.props.crystWorker, inputData);
    }

    /**
     * Handle model name change by updating widget state
     * @param {Event} evt 
     */
    handleChange(evt){
        this.setState({selected:evt.target.value});
    }

    /**
     * Handle chain name change by updating widget state
     * @param {Event} evt 
     */
    handleChainChange(evt){
        this.setState({chainId:evt.target.value});
    }

    /**
     * Handle residue number change by updating widget state
     * @param {Event} evt 
     */
    handleFlipNoChange(evt){
        this.setState({flipRes:evt.target.value});
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
        const mapDataFiles = this.props.mapDataFiles;

        let rows = [];
        let handleFlip = this.handleFlip.bind(self);
        let handleChange = this.handleChange.bind(self);
        let selected = this.state.selected;

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
        <Form.Control required type="number" onChange={this.handleFlipNoChange.bind(this)} placeholder="Residue" value={this.state.flipRes} />
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
