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

class ResidueDataPlot extends Component {

    draw() {
        let scrollX = this.state.scrollX;
        let scrollY = this.state.scrollY;
        const ctx = this.context;
        const c = this.canvasRef.current;
        this.canvasRef.current.style.position = "relative";
        this.canvasRef.current.style.left = scrollX+"px";
        this.canvasRef.current.style.top = scrollY+"px";

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.fillStyle = '#aaa';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = 'black';

        ctx.font = "18px serif";

        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";
        if(this.state.plotInfo){
            for(let i=0;i<this.nRows;i++){
                const ypos = (i + 1) * this.baseLine;
                ctx.beginPath();
                ctx.moveTo(0-scrollX, ypos-scrollY);
                ctx.lineTo(this.maxPerRow*this.dataPointWidth-scrollX, ypos-scrollY);
                ctx.stroke();
            }
            for(let i=0;i<this.state.plotInfo.length;i++){
                const gfrac = 1.0-this.state.plotInfo[i][this.dataKey]/ this.dataInfoScaling;
                ctx.fillStyle = 'rgb(255, '+parseInt(256*gfrac)+', 0)';
                const xpos = i % this.maxPerRow;
                const ypos = (parseInt(i / this.maxPerRow) + 1) * this.baseLine;
                ctx.fillRect(xpos*this.dataPointWidth+this.dataPointSpacing/2-scrollX, ypos-scrollY, this.dataPointWidth-this.dataPointSpacing,-parseInt(this.barHeight * this.state.plotInfo[i][this.dataKey] / this.dataInfoScaling));
            }
            ctx.lineWidth = 2;
            ctx.beginPath();
            for(let i=0;i<this.state.plotInfo.length;i++){
                const xpos = i % this.maxPerRow;
                const ypos = (parseInt(i / this.maxPerRow) + 1) * this.baseLine;
                ctx.moveTo(xpos*this.dataPointWidth+this.dataPointSpacing/2-scrollX, ypos-scrollY);
                ctx.lineTo(xpos*this.dataPointWidth+this.dataPointSpacing/2-scrollX, parseInt(ypos-scrollY-this.barHeight * this.state.plotInfo[i][this.dataKey] / this.dataInfoScaling));
                ctx.lineTo(xpos*this.dataPointWidth+(this.dataPointWidth-this.dataPointSpacing/2)-scrollX, parseInt(ypos-scrollY-this.barHeight * this.state.plotInfo[i][this.dataKey] / this.dataInfoScaling));
                ctx.lineTo(xpos*this.dataPointWidth+(this.dataPointWidth-this.dataPointSpacing/2)-scrollX, ypos-scrollY);
                if(xpos%10==0){
                    ctx.moveTo(xpos*this.dataPointWidth+this.dataPointWidth/2-scrollX, ypos-scrollY);
                    ctx.lineTo(xpos*this.dataPointWidth+this.dataPointWidth/2-scrollX, ypos-scrollY+6);
                }
            }
            ctx.stroke();
            if(this.hit>-1){
                const i = this.hit;
                ctx.strokeStyle = "#fff";
                ctx.beginPath();
                const xpos = i % this.maxPerRow;
                const ypos = (parseInt(i / this.maxPerRow) + 1) * this.baseLine;
                ctx.moveTo(xpos*this.dataPointWidth+this.dataPointSpacing/2-scrollX, ypos-scrollY);
                ctx.lineTo(xpos*this.dataPointWidth+this.dataPointSpacing/2-scrollX, parseInt(ypos-scrollY-this.barHeight * this.state.plotInfo[i][this.dataKey] / this.dataInfoScaling));
                ctx.lineTo(xpos*this.dataPointWidth+(this.dataPointWidth-this.dataPointSpacing/2)-scrollX, parseInt(ypos-scrollY-this.barHeight * this.state.plotInfo[i][this.dataKey] / this.dataInfoScaling));
                ctx.lineTo(xpos*this.dataPointWidth+(this.dataPointWidth-this.dataPointSpacing/2)-scrollX, ypos-scrollY);
                ctx.stroke();
                ctx.strokeStyle = "#000";
            }
            ctx.fillStyle = 'black';
            for(let i=0;i<this.state.plotInfo.length;i++){
                const xpos = i % this.maxPerRow;
                const ypos = (parseInt(i / this.maxPerRow) + 1) * this.baseLine;
                if(xpos%10==0){
                    ctx.fillText(""+i,xpos*this.dataPointWidth+4-scrollX, ypos-scrollY+24);
                }
            }
            if(this.clickHit){
                ctx.fillStyle = '#ddd';
                //FIXME - determine width
                let label;
                if(this.state.plotInfo[this.clickHit.hit].insCode){
                    label = this.state.plotInfo[this.clickHit.hit].chainId + "/" + this.state.plotInfo[this.clickHit.hit].seqNum + ":" + this.state.plotInfo[this.clickHit.hit].insCode + "/(" + this.state.plotInfo[this.clickHit.hit].restype + ")";
                } else {
                    label = this.state.plotInfo[this.clickHit.hit].chainId + "/" + this.state.plotInfo[this.clickHit.hit].seqNum + "/(" + this.state.plotInfo[this.clickHit.hit].restype + ")";
                }
                label += " : " + this.state.plotInfo[this.clickHit.hit][this.dataKey];
                const boxWidth = Math.ceil(ctx.measureText(label).width) + 6;
                ctx.fillRect(this.clickHit.x-scrollX, this.clickHit.y-scrollY, boxWidth, -21);
                ctx.beginPath();
                ctx.moveTo(this.clickHit.x-scrollX, this.clickHit.y-scrollY);
                ctx.lineTo(this.clickHit.x+boxWidth-scrollX, this.clickHit.y-scrollY);
                ctx.lineTo(this.clickHit.x+boxWidth-scrollX, this.clickHit.y-scrollY-21);
                ctx.lineTo(this.clickHit.x-scrollX, this.clickHit.y-scrollY-21);
                ctx.lineTo(this.clickHit.x-scrollX, this.clickHit.y-scrollY);
                ctx.stroke();
                ctx.fillStyle = 'black';
                ctx.fillText(label,this.clickHit.x-scrollX+3, this.clickHit.y-scrollY-3);
            }
        }

    }

    doMouseClick(event,self) {
        this.clickHit = null;
        if(this.state.plotInfo){
            const theHit =  this.getHit(event,self);
            if(theHit&&theHit.hit>-1){
                this.clickHit = theHit;
                if(this.customClickHandler) {
                    this.customClickHandler(theHit);
                }
            }
        }
        this.draw();
    }

    doMouseMove(event,self) {
        this.hit = -1;
        if(this.state.plotInfo){
            const hit = this.getHit(event,self);
            if(hit){
                this.hit = hit.hit;
            }
            this.draw();
        }
    }

    getHit(event,self) {
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
            const diff = (x+this.state.scrollX)/this.dataPointWidth - Math.floor((x+this.state.scrollX)/this.dataPointWidth);
            if(diff>.2&&diff<.8){
                const iRow = parseInt((y+this.state.scrollY-2)/ this.baseLine);
                const ypos = (iRow + 1) * this.baseLine;
                const theHit =  (iRow * this.maxPerRow) + Math.floor((x+this.state.scrollX)/this.dataPointWidth);
                if(theHit<this.state.plotInfo.length){
                    const v = this.state.plotInfo[theHit][this.dataKey] / this.dataInfoScaling;
                    if(y+this.state.scrollY>(ypos-v*this.barHeight)&&y+this.state.scrollY<ypos+2){
                        return {hit:theHit,x:x+this.state.scrollX,y:y+this.state.scrollY};
                    }
                }
            }
        }
        return null;

    }

    componentDidMount() {
        const self = this;
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.context = this.canvasRef.current.getContext('2d', {alpha: false});
        this.draw();
        var rect = this.scrollDivRef.current.getBoundingClientRect();
        this.scrollRef.current.setSize(rect.width,this.baseLine);

        //?
        self.mouseDown = false;
        this.canvasRef.current.addEventListener("mousemove", this.moveHandler , false);
        this.canvasRef.current.addEventListener("click", this.clickHandler, false);
        self.draw();

        // Some testing junk
        this.largeRef.current.style.width = "400px";
        this.largeRef.current.style.height = "200px";

    }

    setScroll(scrollX,scrollY){
        this.setState({scrollX:scrollX,scrollY:scrollY});
    }

    render() {
        if(this.canvasRef.current){
            this.context = this.canvasRef.current.getContext('2d', {alpha: false});
            this.draw();
        }
        this.canvas = <ScrollableCanvas largeRef={this.largeRef} ref={this.scrollRef} onScroll={this.setScroll.bind(this)} canvasRef={this.canvasRef} />;
        return (<div ref={this.scrollDivRef}>{this.canvas}</div>);

    }

    handleResize() {
        if(this.scrollDivRef.current){
            var rect = this.scrollDivRef.current.getBoundingClientRect();
            this.scrollRef.current.setSize(rect.width,this.baseLine);
            this.draw();
        }
    }
    constructor(props) {
        super(props);
        this.xoff = 15;
        this.downX = -1;
        this.downY = -1;
        this.eX = -1;
        this.eY = -1;
        this.state = {scrollX:0,scrollyY:0,plotInfo: null};
        this.canvasRef = createRef();
        this.scrollRef = createRef();
        this.scrollDivRef = createRef();
        this.largeRef = createRef();
        window.addEventListener('resize', this.handleResize.bind(this));

        const self = this;
        this.clickHandler = function(evt){ self.doMouseClick(evt,self); }
        this.moveHandler = function(evt){ self.doMouseMove(evt,self); }

        this.hit = -1;
        this.clickHit = null;

        this.nRows = 1;

        this.baseLine = 75;
        this.barHeight = 40;
        this.maxPerRow = 200;
        this.dataPointWidth = 20;
        this.dataPointSpacing = 8;

    }

    updatePlotData(plotInfo){
        const self = this;
        this.setState({plotInfo:plotInfo},()=>self.draw());

        this.nRows = parseInt((plotInfo.length + this.maxPerRow - 1) / this.maxPerRow);

        this.largeRef.current.style.width = (1+this.maxPerRow)*(this.dataPointWidth)+"px";
        let bigHeight = (this.nRows+1)*75;
        if(bigHeight<200)
            bigHeight = 200;
        this.largeRef.current.style.height = bigHeight+"px";
    }

}

class ResidueData extends Component {

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

        self.plotRef.current.dataKey = this.dataKey;
        self.plotRef.current.dataInfoScaling = this.dataInfoScaling;
        self.plotRef.current.customClickHandler = this.clickHandler;

        if(dataObjectNames[self.infoName] && dataObjectNames[self.infoName][key]){
            self.plotRef.current.updatePlotData(dataObjectNames[self.infoName][key]);
            this.setState({plotInfo:dataObjectNames[self.infoName][key]});
        }

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
        const inputData = {method:self.crystMethod,jobId:jobid,pdbinKey:key,chainId:this.state.chainId};
        self.props.crystWorker.postMessage(inputData);

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
