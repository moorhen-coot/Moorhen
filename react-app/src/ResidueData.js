import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';
import {ScrollableCanvas} from './ScrollableCanvas';

import { guid } from './guid.js';

//TODO - Work with real data rather than random numbers
//TODO - Split over multiple lines for large data sets

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
            ctx.beginPath();
            ctx.moveTo(0-scrollX, 150-scrollY);
            ctx.lineTo(this.state.plotInfo.length*20-scrollX, 150-scrollY);
            ctx.stroke();
            let height = 40;
            for(let i=0;i<this.state.plotInfo.length;i++){
                const gfrac = 1.0-this.state.plotInfo[i][1];
                ctx.fillStyle = 'rgb(255, '+parseInt(256*gfrac)+', 0)';
                ctx.fillRect(i*20+4-scrollX, 150-scrollY, 12,-parseInt(height * this.state.plotInfo[i][1]));
            }
            ctx.lineWidth = 2;
            ctx.beginPath();
            for(let i=0;i<this.state.plotInfo.length;i++){
                ctx.moveTo(i*20+4-scrollX, 150-scrollY);
                ctx.lineTo(i*20+4-scrollX, parseInt(150-scrollY-height * this.state.plotInfo[i][1]));
                ctx.lineTo(i*20+16-scrollX, parseInt(150-scrollY-height * this.state.plotInfo[i][1]));
                ctx.lineTo(i*20+16-scrollX, 150-scrollY);
                if(i%10==0){
                    ctx.moveTo(i*20+10-scrollX, 150-scrollY);
                    ctx.lineTo(i*20+10-scrollX, 150-scrollY+6);
                }
            }
            ctx.stroke();
            if(this.hit>-1){
                const i = this.hit;
                ctx.strokeStyle = "#fff";
                ctx.beginPath();
                ctx.moveTo(i*20+4-scrollX, 150-scrollY);
                ctx.lineTo(i*20+4-scrollX, parseInt(150-scrollY-height * this.state.plotInfo[i][1]));
                ctx.lineTo(i*20+16-scrollX, parseInt(150-scrollY-height * this.state.plotInfo[i][1]));
                ctx.lineTo(i*20+16-scrollX, 150-scrollY);
                ctx.stroke();
                ctx.strokeStyle = "#000";
            }
            ctx.fillStyle = 'black';
            for(let i=0;i<this.state.plotInfo.length;i++){
                if(i%10==0){
                    ctx.fillText(""+i,i*20+4-scrollX, 150-scrollY+24);
                }
            }
        }

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

        this.hit = -1;
        if(this.state.plotInfo){
            const diff = (x+this.state.scrollX)/20. - Math.floor((x+this.state.scrollX)/20.);
            if(diff>.2&&diff<.8){
                const theHit =  Math.floor((x+this.state.scrollX)/20.);
                const v = this.state.plotInfo[theHit][1];
                if(y+this.state.scrollY>(150-v*40)&&y+this.state.scrollY<152){
                    this.hit = theHit;
                }
                this.draw();
            }
        }

    }

    componentDidMount() {
        const self = this;
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.context = this.canvasRef.current.getContext('2d', {alpha: false});
        this.draw();
        var rect = this.scrollDivRef.current.getBoundingClientRect();
        this.scrollRef.current.setSize(rect.width,150);

        //?
        self.mouseDown = false;
        this.canvasRef.current.addEventListener("mousemove", function(evt){ self.doMouseMove(evt,self); }, false);
        self.draw();

        // Some testing junk
        ctx.font = "24px serif";
        const charWidth = Math.ceil(ctx.measureText("does very little.............................................................").width);
        this.largeRef.current.style.width = (charWidth)+"px";
        this.largeRef.current.style.height = ""+(24*8)+"px";

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
            this.scrollRef.current.setSize(rect.width,150);
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
        this.hit = -1;

    }

    updatePlotData(plotInfo){
        const self = this;
        this.setState({plotInfo:plotInfo},()=>self.draw());

        this.largeRef.current.style.width = (1+plotInfo.length)*(20)+"px";
        this.largeRef.current.style.height = ""+(24*8)+"px";
    }

}

class ResidueData extends Component {
    constructor(props) {

        super(props);

        this.plotRef = createRef();

        //FIXME - hack
        let dummyData = [];
        for(let i=0;i<1000;i++){
            const v = Math.random();
            dummyData.push([i,v]);
        }
        this.state = {selected:"unk",log:"", chainId:"", plotInfo: dummyData};
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
        //FIXME - Hack
        self.plotRef.current.updatePlotData(self.state.plotInfo);
        //this.setState({chainId:evt.target.value}, ()=> self.getData());
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
