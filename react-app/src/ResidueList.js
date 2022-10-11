import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';
import {ScrollableCanvas} from './ScrollableCanvas';

import { guid } from './guid.js';

function getOffsetRect(elem) {
    var box = elem.getBoundingClientRect();
    var body = document.body;
    var docElem = document.documentElement;

    var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
    var clientTop = docElem.clientTop || body.clientTop || 0;
    var clientLeft = docElem.clientLeft || body.clientLeft || 0;
    var top  = box.top +  scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;
    return { top: Math.round(top), left: Math.round(left) };
}

class ResidueList extends Component {

    constructor(props) {

        super(props);

        this.plotRef = createRef();

        let dummyData = [];
        this.state = {selected:"unk",log:"", chainId:"", plotInfo: dummyData};
        this.message = "";
        const self = this;

        this.dataKey = this.props.dataKey;
        this.crystMethod = this.props.crystMethod;
        this.infoName = this.props.infoName;
        this.dataInfoScaling = this.props.dataInfoScaling;
        this.clickHandler = this.props.clickHandler;

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
     * Get rotamers data and send message with result to crystallography worker
     */
    async getData(){
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

        const inputData = {method:self.crystMethod,jobId:jobid,pdbinKey:key,chainId:this.state.chainId};
        let response = await this.postCrystWorkerMessage(self.props.crystWorker, inputData);
        if(response.data.result){
            this.setState({plotInfo:response.data.result});
        }
        
    }

    /**
     * Handle model name change by updating widget state
     * @param {Event} evt 
     */
    handleChange(evt){
        const self = this;
        this.setState({selected:evt.target.value}, ()=> self.getData());
    }

    handleSubmit(evt){
        evt.preventDefault();
    }

    /**
     * Handle chain name change by updating widget state
     * @param {Event} evt 
     */
    handleChainChange(evt){
        const self = this;
        this.setState({chainId:evt.target.value}, ()=> self.getData());
    }

    /**
     * Renders widget in html format
     * @returns {string} - html contents with the rendered widget
     */
    render () {
        const styles = reactCSS({
            'default': {
                'scrolllist': {
                     'height': '200px',
                     'overflowX': 'auto',
                     'overflowY': 'scroll',
                },
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

        let buttons = [];
        if(this.state.plotInfo){
            for(let i=0;i<this.state.plotInfo.length;i++){
                const resData = this.state.plotInfo[i];
                if(resData.data&&resData.data.length>0){
                    const buttonId = "reslistbutton-"+i;
                    let buttonLabel;
                    if(resData.insCode){
                        buttonLabel = resData.chainId + "/" + resData.seqNum + "[" + resData.insCode +  "](" + resData.restype + ")";
                    } else {
                        buttonLabel = resData.chainId + "/" + resData.seqNum + "(" + resData.restype + ")";
                    }
                    buttons.push(
                            <Button key={buttonId} variant="primary" size="lg" onClick={self.clickHandler.bind(this,resData)}>
                            {buttonLabel}
                            </Button>
                            )
                }
            }
        }

        //TODO - Need to introspect the pdb file to see what chains exist and pick the first one ...

        return (
                <>
        <Form onSubmit={this.handleSubmit.bind(this)}>
        <Form.Group as={Row} controlId="resListData">
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
        <div className="vspace1em"></div>
        <div style={styles.scrolllist}>
        <div className="d-grid gap-2">
        {buttons}
        </div>
        </div>
        </>
        );
    }
}
export default ResidueList;
