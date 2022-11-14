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

    draw(iframe,oldHit,newHit) {
        this.fixContext();
        var ctx = this.context;
        var c = this.canvasRef.current;
        let pointSize = c.width*0.02

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, c.width, c.height);

        this.hit = newHit;
        if(this.hit>-1){

            ctx.globalAlpha = iframe/this.nAnimationFrames;
            // And we can determine background image with this.
            if (this.state.plotInfo[this.hit].restype=== "GLY") {
                if(this.imageGly) {
                    if(this.imageGly===this.oldImage) ctx.globalAlpha = 1;
                    ctx.drawImage(this.imageGly, 0, 0, c.width, c.height);
                    if(iframe===this.nAnimationFrames-1) this.oldImage = this.imageGly;
                }
            } else {
                if (this.state.plotInfo[this.hit].restype=== "PRO") {
                    if(this.imagePro) {
                        if(this.imagePro===this.oldImage) ctx.globalAlpha = 1;
                        ctx.drawImage(this.imagePro, 0, 0, c.width, c.height);
                        if(iframe===this.nAnimationFrames-1) this.oldImage = this.imagePro;
                    }
                }  else {
                    if (this.state.plotInfo[this.hit].is_pre_pro) {
                        if(this.imagePrePro) {
                            if(this.imagePrePro===this.oldImage) ctx.globalAlpha = 1;
                            ctx.drawImage(this.imagePrePro, 0, 0, c.width, c.height);
                            if(iframe===this.nAnimationFrames-1) this.oldImage = this.imagePrePro;
                        }
                    } else {
                        if (this.state.plotInfo[this.hit].restype=== "ILE" || this.state.plotInfo[this.hit].restype=== "VAL") {
                            if(this.imageIleVal) {
                                if(this.imageIleVal===this.oldImage) ctx.globalAlpha = 1;
                                ctx.drawImage(this.imageIleVal, 0, 0, c.width, c.height);
                                if(iframe===this.nAnimationFrames-1) this.oldImage = this.imageIleVal;
                            }
                        } else {
                            if(this.imageNonGlyProIleVal) {
                                if(this.imageNonGlyProIleVal===this.oldImage) ctx.globalAlpha = 1;
                                ctx.drawImage(this.imageNonGlyProIleVal, 0, 0, c.width, c.height);
                                if(iframe===this.nAnimationFrames-1) this.oldImage = this.imageNonGlyProIleVal;
                            }
                        }
                    }
                }
            }

            if(Math.abs(ctx.globalAlpha-1.0)>1e-2){
                if(this.oldImage) {
                    ctx.globalAlpha = 1.0-iframe/this.nAnimationFrames;
                    ctx.drawImage(this.oldImage, 0, 0, c.width, c.height);
                } else if(this.imageAll) {
                    ctx.globalAlpha = 1.0-iframe/this.nAnimationFrames;
                    ctx.drawImage(this.imageAll, 0, 0, c.width, c.height);
                }
            }

        } else {
            ctx.globalAlpha = 1.0;
            if(this.oldImage) {
                ctx.drawImage(this.oldImage, 0, 0, c.width, c.height);
            } else if(this.imageAll) {
                ctx.drawImage(this.imageAll, 0, 0, c.width, c.height);
            }
        }
        ctx.globalAlpha = 1.0;

        const imageData3 = ctx.getImageData(0, 0, c.width, c.height);

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        if(this.state.plotInfo&&this.imgOtherOutlier&&this.imgOtherNormal&&this.imgGlyOutlier&&this.imgProOutlier){
            for(let ip=0;ip<this.state.plotInfo.length;ip++){
                let phitest = this.state.plotInfo[ip].phi;
                let psitest = this.state.plotInfo[ip].psi;
                let x = parseInt(((phitest /180.) * 0.5 + 0.5) * c.width);
                let y = parseInt(((-psitest /180.) * 0.5 + 0.5) * c.height);

                if(this.state.plotInfo[ip].isOutlier){
                    if(this.state.plotInfo[ip].restype==="PRO"){
                        ctx.drawImage(this.imgProOutlier, x-4, y-4, pointSize, pointSize);
                    } else if(this.state.plotInfo[ip].restype==="GLY"){
                        ctx.drawImage(this.imgGlyOutlier, x-4, y-4, pointSize, pointSize);
                    } else {
                        ctx.drawImage(this.imgOtherOutlier, x-4, y-4, pointSize, pointSize);
                    }
                } else {
                    if(this.state.plotInfo[ip].restype==="PRO"){
                        ctx.drawImage(this.imgProNormal, x-4, y-4, pointSize, pointSize);
                    } else if(this.state.plotInfo[ip].restype==="GLY"){
                        ctx.drawImage(this.imgGlyNormal, x-4, y-4, pointSize, pointSize);
                    } else {
                        ctx.drawImage(this.imgOtherNormal, x-4, y-4, pointSize, pointSize);
                    }
                }
            }
            if(this.hit>-1){
                let phitest = this.state.plotInfo[this.hit].phi;
                let psitest = this.state.plotInfo[this.hit].psi;
                let x = parseInt(((phitest /180.) * 0.5 + 0.5) * c.width);
                let y = parseInt(((-psitest /180.) * 0.5 + 0.5) * c.height);

                if(this.state.plotInfo[this.hit].isOutlier){
                    if(this.state.plotInfo[this.hit].restype==="PRO"){
                        ctx.drawImage(this.imgProOutlier, x-4-iframe/this.nAnimationFrames*2, y-4-iframe/this.nAnimationFrames*2, pointSize+iframe/this.nAnimationFrames*4, pointSize+iframe/this.nAnimationFrames*4);
                    } else if(this.state.plotInfo[this.hit].restype==="GLY"){
                        ctx.drawImage(this.imgGlyOutlier, x-4-iframe/this.nAnimationFrames*2, y-4-iframe/this.nAnimationFrames*2, pointSize+iframe/this.nAnimationFrames*4, pointSize+iframe/this.nAnimationFrames*4);
                    } else {
                        ctx.drawImage(this.imgOtherOutlier, x-4-iframe/this.nAnimationFrames*2, y-4-iframe/this.nAnimationFrames*2, pointSize+iframe/this.nAnimationFrames*4, pointSize+iframe/this.nAnimationFrames*4);
                    }
                } else {
                    if(this.state.plotInfo[this.hit].restype==="PRO"){
                        ctx.drawImage(this.imgProNormal, x-4-iframe/this.nAnimationFrames*2, y-4-iframe/this.nAnimationFrames*2, pointSize+iframe/this.nAnimationFrames*4, pointSize+iframe/this.nAnimationFrames*4);
                    } else if(this.state.plotInfo[this.hit].restype==="GLY"){
                        ctx.drawImage(this.imgGlyNormal, x-4-iframe/this.nAnimationFrames*2, y-4-iframe/this.nAnimationFrames*2, pointSize+iframe/this.nAnimationFrames*4, pointSize+iframe/this.nAnimationFrames*4);
                    } else {
                        ctx.drawImage(this.imgOtherNormal, x-4-iframe/this.nAnimationFrames*2, y-4-iframe/this.nAnimationFrames*2, pointSize+iframe/this.nAnimationFrames*4, pointSize+iframe/this.nAnimationFrames*4);
                    }
                }
            }
        }
        if(iframe<this.nAnimationFrames)
            this.reqRef = requestAnimationFrame(this.draw.bind(this,iframe+1,oldHit,newHit));
        else
            this.reqRef = null;
    }

    fixContext() {
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);
    }

    handleLoad() {
        this.imageAll = this.imageRefAll.current;
        this.imageGly = this.imageRefGly.current;
        this.imagePro = this.imageRefPro.current;
        this.imagePrePro = this.imageRefPrePro.current;
        this.imageIleVal = this.imageRefIleVal.current;
        this.imageNonGlyPro = this.imageRefNonGlyPro.current;
        this.imageNonGlyProIleVal = this.imageRefNonGlyProIleVal.current;
        this.imgOtherOutlier = this.ramaPlotOtherOutlierImageRef.current;
        this.imgOtherNormal = this.ramaPlotOtherNormalImageRef.current;
        this.imgProOutlier = this.ramaPlotProOutlierImageRef.current;
        this.imgProNormal = this.ramaPlotProNormalImageRef.current;
        this.imgGlyOutlier = this.ramaPlotGlyOutlierImageRef.current;
        this.imgGlyNormal = this.ramaPlotGlyNormalImageRef.current;
        this.draw(-1);
    }

    doMouseClick(event,self) {
        if(this.state.plotInfo){
            const hit = this.getHit(event,self);
            if(this.props.onClick&&hit>-1){
                // WARNING: ALWAYS ASSUMING FIRST MODEL IN MOLECULE
                this.props.onClick({modelIndex:0, coordMolNo:this.state.coordMolNo, molName:this.state.molName, chain:this.state.chainId, seqNum:this.state.plotInfo[hit].seqNum, insCode:this.state.plotInfo[hit].insCode});
            }
        }
    }

    doMouseMove(event,self) {
        let oldHit = this.hit;
        function animate() {
            if(oldHit===self.hit) return;
            if(self.reqRef) cancelAnimationFrame(self.reqRef);
            self.reqRef = requestAnimationFrame(self.draw.bind(self,0,oldHit,self.hit));
        }
        if(this.state.plotInfo){
            const hit = this.getHit(event,self);
            this.hit = hit;
            if(hit>-1){
                animate()
                this.props.setMessage(`${this.state.molName} / ${this.state.chainId} / ${this.state.plotInfo[hit].seqNum} (${this.state.plotInfo[hit].restype})`)
            };
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
            return ihit;
        }
        return -1;

    }

    setBackgroundImages() {
        const self = this;
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);

        const imgAll = new window.Image();
        imgAll.src = "pixmaps/rama2_all.png";
        imgAll.crossOrigin="Anonymous";
        this.imageRefAll.current = imgAll;
        this.imageRefAll.current.addEventListener('load', this.handleLoad.bind(self));

        const imgGly = new window.Image();
        imgGly.src = "pixmaps/rama2_gly.png";
        imgGly.crossOrigin="Anonymous";
        this.imageRefGly.current = imgGly;
        this.imageRefGly.current.addEventListener('load', this.handleLoad.bind(self));

        const imgPrePro = new window.Image();
        imgPrePro.src = "pixmaps/rama2_pre_pro.png";
        imgPrePro.crossOrigin="Anonymous";
        this.imageRefPrePro.current = imgPrePro;
        this.imageRefPrePro.current.addEventListener('load', this.handleLoad.bind(self));

        const imgPro = new window.Image();
        imgPro.src = "pixmaps/rama2_pro.png";
        imgPro.crossOrigin="Anonymous";
        this.imageRefPro.current = imgPro;
        this.imageRefPro.current.addEventListener('load', this.handleLoad.bind(self));

        const imgIleVal = new window.Image();
        imgIleVal.src = "pixmaps/rama2_ileval.png";
        imgIleVal.crossOrigin="Anonymous";
        this.imageRefIleVal.current = imgIleVal;
        this.imageRefIleVal.current.addEventListener('load', this.handleLoad.bind(self));

        const imgNonGlyPro = new window.Image();
        imgNonGlyPro.src = "pixmaps/rama2_non_gly_pro.png";
        imgNonGlyPro.crossOrigin="Anonymous";
        this.imageRefNonGlyPro.current = imgNonGlyPro;
        this.imageRefNonGlyPro.current.addEventListener('load', this.handleLoad.bind(self));

        const imgNonGlyProIleVal = new window.Image();
        imgNonGlyProIleVal.src = "pixmaps/rama2_non_gly_pro_pre_pro_ileval.png";
        imgNonGlyProIleVal.crossOrigin="Anonymous";
        this.imageRefNonGlyProIleVal.current = imgNonGlyProIleVal;
        this.imageRefNonGlyProIleVal.current.addEventListener('load', this.handleLoad.bind(self));

        const imgGlyNormal = new window.Image();
        imgGlyNormal.src = "pixmaps/rama-plot-gly-normal.png";
        imgGlyNormal.crossOrigin="Anonymous";
        this.ramaPlotGlyNormalImageRef.current = imgGlyNormal;
        this.ramaPlotGlyNormalImageRef.current.addEventListener('load', this.handleLoad.bind(self));

        const imgGlyOutlier = new window.Image();
        imgGlyOutlier.src = "pixmaps/rama-plot-gly-outlier.png";
        imgGlyOutlier.crossOrigin="Anonymous";
        this.ramaPlotGlyOutlierImageRef.current = imgGlyOutlier;
        this.ramaPlotGlyOutlierImageRef.current.addEventListener('load', this.handleLoad.bind(self));

        const imgProNormal = new window.Image();
        imgProNormal.src = "pixmaps/rama-plot-pro-normal.png";
        imgProNormal.crossOrigin="Anonymous";
        this.ramaPlotProNormalImageRef.current = imgProNormal;
        this.ramaPlotProNormalImageRef.current.addEventListener('load', this.handleLoad.bind(self));

        const imgProOutlier = new window.Image();
        imgProOutlier.src = "pixmaps/rama-plot-pro-outlier.png";
        imgProOutlier.crossOrigin="Anonymous";
        this.ramaPlotProOutlierImageRef.current = imgProOutlier;
        this.ramaPlotProOutlierImageRef.current.addEventListener('load', this.handleLoad.bind(self));

        const imgOtherNormal = new window.Image();
        imgOtherNormal.src = "pixmaps/rama-plot-other-normal.png";
        imgOtherNormal.crossOrigin="Anonymous";
        this.ramaPlotOtherNormalImageRef.current = imgOtherNormal;
        this.ramaPlotOtherNormalImageRef.current.addEventListener('load', this.handleLoad.bind(self));

        const imgOtherOutlier = new window.Image();
        imgOtherOutlier.src = "pixmaps/rama-plot-other-outlier.png";
        imgOtherOutlier.crossOrigin="Anonymous";
        this.ramaPlotOtherOutlierImageRef.current = imgOtherOutlier;
        this.ramaPlotOtherOutlierImageRef.current.addEventListener('load', this.handleLoad.bind(self));

        self.mouseDown = false;
        this.canvasRef.current.addEventListener("mousemove", this.moveHandler , false);
        this.canvasRef.current.addEventListener("click", this.clickHandler, false);
    }

    componentDidMount() {
        this.setBackgroundImages();
    }

    componentDidUpdate(prevProps, prevState) {       
        if (this.canvasRef.current === null || this.state.ramaPlotDimensions === prevState.ramaPlotDimensions) {
            return;
        }

        this.setBackgroundImages();
    }


    render() {
        this.canvas = <canvas style={{marginTop:'1rem'}} height={this.state.ramaPlotDimensions} width={this.state.ramaPlotDimensions} ref={this.canvasRef} />;  
        return this.canvas;
    }

    constructor(props) {
        super(props);
        this.reqRef = null;
        this.oldImage = null;
        this.nAnimationFrames = 15;
        this.state = {plotInfo: null, molName:null, chainId:null, coordMolNo:null, ramaPlotDimensions:230};
        this.canvasRef = createRef();
        this.imageRefAll = createRef();
        this.imageRefGly = createRef();
        this.imageRefPro = createRef();
        this.imageRefPrePro = createRef();
        this.imageRefIleVal = createRef();
        this.imageRefNonGlyPro = createRef();
        this.imageRefNonGlyProIleVal = createRef();
        this.ramaPlotGlyNormalImageRef = createRef();
        this.ramaPlotGlyOutlierImageRef = createRef();
        this.ramaPlotProNormalImageRef = createRef();
        this.ramaPlotProOutlierImageRef = createRef();
        this.ramaPlotOtherNormalImageRef = createRef();
        this.ramaPlotOtherOutlierImageRef = createRef();
        this.imageAll = null;
        this.ramaPlotGlyNormalImage = null;
        this.ramaPlotGlyOutlierImage = null;
        this.ramaPlotProNormalImage = null;
        this.ramaPlotProOutlierImage = null;
        this.ramaPlotOtherNormalImage = null;
        this.ramaPlotOtherOutlierImage = null;
        this.hit = -1;
        const self = this;
        this.clickHandler = function(evt){ self.doMouseClick(evt,self); }
        this.moveHandler = function(evt){ self.doMouseMove(evt,self); }
    }

    updatePlotData(plotInfo){
        const self = this;
        this.setState({plotInfo:plotInfo.info, molName:plotInfo.molName, chainId:plotInfo.chainId, coordMolNo:plotInfo.coordMolNo},()=>self.draw(-1));
    }

}

class Ramachandran extends Component {
    constructor(props) {
        super(props);
        this.ramaRef = createRef();
        this.state = {selected:"unk",log:"", chainId:"", plotInfo: null, sideBarWidth:props.sideBarWidth, toolAccordionBodyHeight:props.toolAccordionBodyHeight};
        this.message = "";
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
     * Get ramachandran plot and send message with result to crystallography worker
     */
    async getRama(){
        if(this.props.molecules<1){
            return;
        }

        let coordMolNo = this.state.selected;        
        const coordMolNums = this.props.molecules.map(molecule => molecule.coordMolNo);
        const molNames = this.props.molecules.map(molecule => molecule.name);
        let molName = null;
        let moleculeIndex = 0;
        
        if(coordMolNo==="unk"){
            coordMolNo = coordMolNums[moleculeIndex];
            molName = molNames[moleculeIndex];
        } else {
            moleculeIndex = coordMolNums.findIndex(num => num == coordMolNo)
            molName = molNames[moleculeIndex];
        }        

        const inputData = {message:"get_rama", coordMolNo:coordMolNo, chainId:this.state.chainId};
        let response = await this.props.postCootMessage(this.props.cootWorker, inputData);
        this.ramaRef.current.updatePlotData({info:response.data.result, molName:molName, chainId:this.state.chainId, coordMolNo:coordMolNo});
        
        this.props.setActiveCoordMolNo(coordMolNo);
        this.props.setactiveChainId(this.state.chainId);
        this.props.setMoleculeIndex(moleculeIndex)
        this.setState({plotInfo:response.data.result});
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

        let rows = [];
        let selected = this.state.selected;
        let handleChange = this.handleChange.bind(self);

        this.props.molecules.forEach(molecule => {
            rows.push(<option key={molecule.coordMolNo} value={molecule.coordMolNo}>{molecule.name}</option>);
        });        

        if(selected==="unk" && this.props.molecules.length>0){
            selected = this.props.molecules[0].coordMolNo;
        }
        
        //TODO - Need to introspect the pdb file to see what chains exist and pick the first one ...

        return (
                <>
        <Form style={{margin:'0', padding:'0'}} onSubmit={this.handleSubmit.bind(this)}>
            <Form.Group controlId="rama">
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
        <RamaPlot onClick={this.props.onClick} setMessage={this.props.setMessage} ref={this.ramaRef} toolAccordionBodyHeight={this.state.toolAccordionBodyHeight} sideBarWidth={this.state.sideBarWidth}/>
        </>
        );
    }
}
export { Ramachandran, RamaPlot};
