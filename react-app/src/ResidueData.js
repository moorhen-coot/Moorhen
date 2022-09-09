import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';

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

class ResidueDataPlot extends Component {

    draw() {
        this.fixContext();
        var ctx = this.context;
        var c = this.canvasRef.current;

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = 'black';
        ctx.font = "24px serif";
        ctx.fillText('This widget currently', 10, 50);
        ctx.fillText('does very little...', 10, 80);
        if(this.state.plotInfo&&this.state.plotInfo.length>0){
            //FIXME Now do something useful!!
            ctx.fillText(this.state.plotInfo[0].chainId+"/"+this.state.plotInfo[0].seqNum+this.state.plotInfo[0].insCode+": "+this.state.plotInfo[0].bval, 10, 110);
        }
    }

    fixContext() {
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);
    }

    doMouseMove(event,self) {
        var x;
        var y;
        var e = event;
        if (e.pageX || e.pageY) {
            x = e.pageX;
            y = e.pageY;
        }
        else {
            x = e.clientX ;
            y = e.clientY ;
        }

        var c = this.canvasRef.current;
        var offset = getOffsetRect(c);

        x -= offset.left;
        y -= offset.top;
        
        if(this.state.plotInfo){
            let ihit = -1;
            let mindist = 100000;
            for(let ip=0;ip<this.state.plotInfo.length;ip++){
            }
            if(ihit>-1){
                this.hit = ihit;
                this.draw();
            }
        }

    }

    componentDidMount() {
        const self = this;
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);

        self.mouseDown = false;
        this.canvasRef.current.addEventListener("mousemove", function(evt){ self.doMouseMove(evt,self); }, false);
        self.draw();
    }

    render() {
        const height = 230;
        const width = 230;
        this.canvas = <canvas height={height} height={height} ref={this.canvasRef} />;  
        return this.canvas;
    }

    constructor(props) {
        super(props);
        this.state = {plotInfo: null};
        this.canvasRef = createRef();
        this.hit = -1;
    }

    updatePlotData(plotInfo){
        const self = this;
        this.setState({plotInfo:plotInfo},()=>self.draw());
    }
    
}

class ResidueData extends Component {
    constructor(props) {

        super(props);

        this.plotRef = createRef();

        this.state = {selected:"unk",log:"", chainId:"", plotInfo: null};
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
        const self = this;
        this.setState({selected:evt.target.value}, ()=> self.getData());
    }


    handleSubmit(evt){
        evt.preventDefault();
    }

    getData(){
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
        const inputData = {method:"get_bvals",jobId:jobid,pdbinKey:key,chainId:this.state.chainId};
        self.props.crystWorker.postMessage(inputData);
        console.log(inputData);
        
    }

    updatePlotData(){
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
        if(dataObjectNames.bvalInfo && dataObjectNames.bvalInfo[key]){
            self.plotRef.current.updatePlotData(dataObjectNames.bvalInfo[key]);
            this.setState({plotInfo:dataObjectNames.bvalInfo[key]});
        }
        
    }

    handleChainChange(evt){
        const self = this;
        this.setState({chainId:evt.target.value}, ()=> self.getData());
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
        <div className="vspace1em"></div>
        <ResidueDataPlot ref={this.plotRef} />
        </>
        );
    }
}
export default ResidueData;
