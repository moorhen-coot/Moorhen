import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';

import { guid } from './guid.js';

class RamaPlot extends Component {

    draw() {
        this.fixContext();
        var ctx = this.context;
        var c = this.canvasRef.current;

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.fillStyle = 'green';
        ctx.fillRect(0, 0, c.width, c.height);
        if(this.image) {
            ctx.drawImage(this.image, 0, 0, c.width, c.height);
        }
    }

    fixContext() {
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);
    }

    handleLoad() {
        this.image = this.imageRef.current;
        this.draw();
    }

    componentDidMount() {
        const self = this;
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);
        const img = new window.Image();
        img.src = "/rama2_all.png";
        img.crossOrigin="Anonymous";
        this.imageRef.current = img;
        this.imageRef.current.addEventListener('load', this.handleLoad.bind(self));
        console.log("componentDidMount");
        console.log(this.imageRef);
        self.mouseDown = false;
    }

    render() {
        const height = 250;
        const width = 250;
        this.canvas = <canvas height={height} height={height} ref={this.canvasRef} />;  
        return this.canvas;
    }

    constructor(props) {
        super(props);
        this.canvasRef = createRef();
        this.imageRef = createRef();
        this.image = null;
    }
    
}

class Ramachandran extends Component {
    constructor(props) {

        super(props);

        this.ramaRef = createRef();

        this.state = {selected:"unk",log:"", chainId:""};
        this.message = "";
        const self = this;
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

    handleChange(evt){
        this.setState({selected:evt.target.value});
    }


    handleChainChange(evt){
        this.setState({chainId:evt.target.value});
        console.log(this.props.sharedArrayBuffer);
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

        let rows = [];
        let selected = this.state.selected;
        let handleChange = this.handleChange.bind(self);

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

        if(selected==="unk"&&pdbKeys.length>0){
            selected = pdbKeys[0];
        }

        //TODO - Need to introspect the pdb file to see what chains exist and pick the first one ...
        console.log(selected);

        return (
                <>
        <Form>
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
        <div className="vspace1em"></div>
        <RamaPlot ramaRef={this.ramaRef} />
        </>
        );
    }
}
export default Ramachandran;
