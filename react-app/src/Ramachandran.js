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

class RamaPlot extends Component {

    draw() {
        this.fixContext();
        var ctx = this.context;
        var c = this.canvasRef.current;

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, c.width, c.height);

        if(this.image) {
            ctx.drawImage(this.image, 0, 0, c.width, c.height);
        }

        const imageData3 = ctx.getImageData(0, 0, c.width, c.height);

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        if(this.state.plotInfo){
            for(let ip=0;ip<this.state.plotInfo.length;ip++){
                let phitest = this.state.plotInfo[ip].phi;
                let psitest = this.state.plotInfo[ip].psi;
                let x = parseInt(((phitest /180.) * 0.5 + 0.5) * c.width);
                let y = parseInt(((-psitest /180.) * 0.5 + 0.5) * c.height);

                //FIXME - Do we *know* this is RGBA?
                const r = imageData3.data[4*y*imageData3.width+4*x];
                const g = imageData3.data[4*y*imageData3.width+4*x+1];
                const b = imageData3.data[4*y*imageData3.width+4*x+2];
                if(r>250&&g>250&&b>250){
                    ctx.strokeStyle = 'red';
                }

                ctx.beginPath();
                ctx.moveTo(x-3, y);
                ctx.lineTo(x+3, y);
                ctx.moveTo(x, y-3);
                ctx.lineTo(x, y+3);
                ctx.stroke();
                if(r>250&&g>250&&b>250){
                    ctx.strokeStyle = 'black';
                }
            }
            if(this.hit>-1){
                ctx.lineWidth = 3;
                let phitest = this.state.plotInfo[this.hit].phi;
                let psitest = this.state.plotInfo[this.hit].psi;
                let x = parseInt(((phitest /180.) * 0.5 + 0.5) * c.width);
                let y = parseInt(((-psitest /180.) * 0.5 + 0.5) * c.height);

                const r = imageData3.data[4*y*imageData3.width+4*x];
                const g = imageData3.data[4*y*imageData3.width+4*x+1];
                const b = imageData3.data[4*y*imageData3.width+4*x+2];
                if(r>250&&g>250&&b>250){
                    ctx.strokeStyle = 'red';
                }
                ctx.beginPath();
                ctx.moveTo(x-5, y);
                ctx.lineTo(x+5, y);
                ctx.moveTo(x, y-5);
                ctx.lineTo(x, y+5);
                ctx.stroke();
                if(r>250&&g>250&&b>250){
                    ctx.strokeStyle = 'black';
                }
            }
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
                let phitest = this.state.plotInfo[ip].phi;
                let psitest = this.state.plotInfo[ip].psi;
                let xp = ((phitest /180.) * 0.5 + 0.5) * c.width;
                let yp = ((-psitest /180.) * 0.5 + 0.5) * c.height;
                if((Math.abs(xp-x)<3)&&(Math.abs(yp-y)<3)){
                    let dist = (xp-x)*(xp-x) + (yp-y)*(yp-y);
                    if(dist<mindist){
                        mindist = dist;
                        ihit = ip;
                    }
                }
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
        const img = new window.Image();
        img.src = "/rama2_all.png";
        img.crossOrigin="Anonymous";
        this.imageRef.current = img;
        this.imageRef.current.addEventListener('load', this.handleLoad.bind(self));
        console.log("componentDidMount");
        console.log(this.imageRef);
        self.mouseDown = false;
        this.canvasRef.current.addEventListener("mousemove", function(evt){ self.doMouseMove(evt,self); }, false);
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
        this.imageRef = createRef();
        this.image = null;
        this.hit = -1;
    }

    updatePlotData(plotInfo){
        const self = this;
        this.setState({plotInfo:plotInfo},()=>self.draw());
    }
    
}

class Ramachandran extends Component {
    constructor(props) {

        super(props);

        this.ramaRef = createRef();

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
        this.setState({selected:evt.target.value}, ()=> self.getRama());
    }


    handleSubmit(evt){
        evt.preventDefault();
    }

    getRama(){
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
        const inputData = {method:"get_rama",jobId:jobid,pdbinKey:key,chainId:this.state.chainId};
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
        self.ramaRef.current.updatePlotData(dataObjectNames.ramaInfo[key]);
        this.setState({plotInfo:dataObjectNames.ramaInfo[key]});
        
    }

    handleChainChange(evt){
        const self = this;
        //TODO - calling getRama should be more sane ?
        this.setState({chainId:evt.target.value}, ()=> self.getRama());
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
        <RamaPlot ref={this.ramaRef} />
        </>
        );
    }
}
export default Ramachandran;
