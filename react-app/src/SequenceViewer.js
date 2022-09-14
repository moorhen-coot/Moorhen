import React, { createRef, Component } from 'react';

import Table from 'react-bootstrap/Table';

import {getOffsetRect} from './LightSphere';
import {ScrollableCanvas} from './ScrollableCanvas';

function RoundToNearest(n, x) {
    return Math.round(n / x) * x;
} 

const sequenceNucleicOneLetterMap = {
    //I have this in case there are other letters I want to map.
    "A": "A",
    "T": "T",
    "G": "G",
    "C": "C",
    "U": "U",
}

const sequenceAminoOneLetterMap = {
    'A':"ALA",
    'R':"ARG",
    'N':"ASN",
    'D':"ASP",
    'C':"CYS",
    'Q':"GLN",
    'E':"GLU",
    'G':"GLY",
    'H':"HIS",
    'I':"ILE",
    'L':"LEU",
    'K':"LYS",
    'M':"MET",
    'F':"PHE",
    'P':"PRO",
    'S':"SER",
    'T':"THR",
    'W':"TRP",
    'Y':"TYR",
    'V':"VAL",
}

const sequenceColors = {
    "PHE": "magenta",
    "TRP": "magenta",
    "TYR": "magenta",
    "PRO": "coral",
    "VAL": "coral",
    "ALA": "coral",
    "ILE": "coral",
    "LEU": "coral",
    "SER": "cyan",
    "THR": "cyan",
    "ASN": "cyan",
    "GLN": "cyan",
    "ARG": "blue",
    "LYS": "blue",
    "ASP": "red",
    "GLU": "red",
    "CYS": "yellow",
    "MET": "yellow",
    "GLY": "white",
    "HIS": "#7777FF",
    "A": "red",
    "T": "yellow",
    "G": "green",
    "C": "blue",
    "U": "magenta",
    "DA": "red",
    "DT": "yellow",
    "DG": "green",
    "DC": "blue",
    "ADE": "red",
    "THY": "yellow",
    "GUA": "green",
    "CYT": "blue",
    "URA": "magenta",
}

// https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-using-html-canvas
/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }

}

class SequenceViewer extends Component {
  
    select(keep) {
        let scrollX = this.state.scrollX;
        let scrollY = this.state.scrollY;
        const ctx = this.context;
        const c = this.canvasRef.current;
        const sequences = this.state.sequences;

        ctx.font = "bold " + this.charHeight+'px Courier';

        const charWidth = Math.ceil(ctx.measureText("M").width);
        const descent = ctx.measureText("y").actualBoundingBoxDescent;

        let x = this.downX;
        let y = this.downY;
        let w = -this.downX+this.eX;
        let h = -this.downY+this.eY;

        x = RoundToNearest(x,charWidth);
        w = RoundToNearest(w,charWidth);
        y = RoundToNearest(y,this.charHeight);
        h = RoundToNearest(h,this.charHeight);

        for(var iseq=0;iseq<sequences.length;iseq++){
            if(iseq<sequences.length){
                var inY = false;
                if(((iseq+2)*this.charHeight>y&&(iseq+2)*this.charHeight<=(y+h))||((iseq+1)*this.charHeight>=(y+h)&&(iseq+1)*this.charHeight<(y))){
                    inY = true; 
                }
                for(var icL=0;icL<sequences[iseq].sequence.length;icL++){
                    var inX = false;
                    let ic = icL;
                    if(((ic+2+this.xoff-1)*charWidth>(x)&&(ic+2+this.xoff-1)*charWidth<=(x+w))||((ic+1+this.xoff-1)*charWidth>=(x+w)&&(ic+1+this.xoff-1)*charWidth<(x))){
                        inX = true;
                    }
                    if(inX&&inY){
                        this.selected_temp[iseq][icL] = true;
                    } else {
                        //FIXME - And this is where will we do multiple selection.
                        this.selected_temp[iseq][icL] = false;
                    }
                }
            }
        }


    }

    draw() {
        let scrollX = this.state.scrollX;
        let scrollY = this.state.scrollY;
        const ctx = this.context;
        const c = this.canvasRef.current;
        this.canvasRef.current.style.position = "relative";
        this.canvasRef.current.style.left = scrollX+"px";
        this.canvasRef.current.style.top = scrollY+"px";
        const sequences = this.state.sequences;

        ctx.fillStyle = "gray";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = "bold " + this.charHeight+'px Courier';

        const charWidth = Math.ceil(ctx.measureText("M").width);
        const descent = ctx.measureText("y").actualBoundingBoxDescent;

        let x = this.downX;
        let y = this.downY;
        let w = -this.downX+this.eX;
        let h = -this.downY+this.eY;

        x = RoundToNearest(x,charWidth);
        w = RoundToNearest(w,charWidth);
        y = RoundToNearest(y,this.charHeight);
        h = RoundToNearest(h,this.charHeight);

        ctx.strokeStyle = "#000";
        ctx.beginPath();
        ctx.rect(x-scrollX,y+descent-scrollY,w,h);
        ctx.stroke();

        ctx.fillStyle = "black";
        let maxIC = 10000;
        ctx.fillText("1",charWidth*(this.xoff)-scrollX,1*this.charHeight);
        for(let ic=9;ic<maxIC;ic+=10){
            ctx.fillText((ic+1).toString(),charWidth*(ic+this.xoff)-scrollX,1*this.charHeight);
        }

        ctx.fillStyle = "pink";
        ctx.fillRect(0, 0, (this.xoff-1)*charWidth, c.height);
        ctx.fillStyle = "black";
        ctx.font = this.charHeight+'px Helvetica, Arial, Sans-Serif';
        for(var iseqL=0;iseqL<sequences.length;iseqL++){
            let iseq = iseqL+parseInt(scrollY/this.charHeight);
            if(iseq<sequences.length){
                if(sequences[iseq].name.length<11){
                    ctx.fillText(sequences[iseq].name.substr(0,11),0,(iseq+2)*this.charHeight-scrollY);
                } else {
                    ctx.fillText(sequences[iseq].name.substr(0,5)+'...'+sequences[iseq].name.substr(sequences[iseq].name.length-5,5),0,(iseq+2)*this.charHeight-scrollY);
                }
            }
        }

        ctx.font = "bold " + this.charHeight+'px Courier';

        for(var iseqL=0;iseqL<sequences.length;iseqL++){
                            
            let iseq = iseqL+parseInt(scrollY/this.charHeight);
            if(iseq<sequences.length){

                const index = this.state.selectedSequences.indexOf(iseq);
                if(index>-1){
                    ctx.fillStyle = "#55f";
                } else {
                    ctx.fillStyle = "#ddd";
                }
                ctx.lineWidth = 1;
                roundRect(ctx,charWidth*(this.xoff-3),(iseq+1)*this.charHeight+descent-scrollY+2, this.charHeight-4, this.charHeight-4, 4, true, true);
                if(index>-1){
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    var tlx = charWidth*(this.xoff-3);
                    var tly = (iseq+1)*this.charHeight+descent-scrollY+2;
                    ctx.moveTo(tlx + 3,tly + 0.4*this.charHeight);
                    ctx.lineTo(tlx + 0.4*this.charHeight-2,tly  + this.charHeight-7);
                    ctx.lineTo(tlx + 0.9*this.charHeight-4,tly  + 2);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#000";


                for(var icL=0;icL<sequences[iseq].sequence.length;icL++){
                    if(icL+parseInt(scrollX/charWidth)<sequences[iseq].sequence.length){
                        let ic = icL+parseInt(scrollX/charWidth);
                        let color = "white";
                        if(sequences[iseq].type==="peptide"||sequences[iseq].type==="polypeptide(L)"){
                            color = sequenceColors[sequenceAminoOneLetterMap[sequences[iseq].sequence[ic]]];
                        } else if(sequences[iseq].type==="nucleic"||sequences[iseq].type==="polydeoxyribonucleotide"||sequences[iseq].type==="polyribonucleotide"){
                            color = sequenceColors[sequenceNucleicOneLetterMap[sequences[iseq].sequence[ic]]];
                        }
                        if(this.selected[iseq]&&this.selected[iseq][ic]){
                            ctx.fillStyle = color;
                            ctx.fillRect(charWidth*(ic+this.xoff)-scrollX,(iseq+1)*this.charHeight+descent-scrollY, charWidth, this.charHeight);
                            ctx.fillStyle = "black";
                            ctx.fillText(sequences[iseq].sequence[ic],charWidth*(ic+this.xoff)-scrollX,(iseq+2)*this.charHeight-scrollY);
                        } else {
                            //console.log("A letter",sequences[iseq].sequence[ic],ic);
                            ctx.fillStyle = color;
                            ctx.fillText(sequences[iseq].sequence[ic],charWidth*(ic+this.xoff)-scrollX,(iseq+2)*this.charHeight-scrollY);
                        }
                    }
                }
            }
        }

    }

    handleResize() {
        if(this.scrollDivRef.current){
            var rect = this.scrollDivRef.current.getBoundingClientRect();
            this.scrollRef.current.setSize(rect.width,150);
            this.draw();
        }
    }

    doMouseDoubleClick(event,self) {
        const ctx = this.context;
        ctx.font = "bold " + this.charHeight+'px Courier';
        const charWidth = Math.ceil(ctx.measureText("M").width);
        var xy = this.getEventXY(event);
        if(xy[0]<10*charWidth) return;
        const sequences = this.state.sequences;
        var eX = xy[0] + this.state.scrollX;
        var eY = xy[1] + this.state.scrollY;
        var iseq = Math.floor(eY/this.charHeight-1);
        var ic = Math.floor(eX/charWidth-1);
        if(iseq>-1&&iseq<sequences.length&&(ic-this.xoff+1)<sequences[iseq].sequence.length){
            var t = sequences[iseq].sequence[ic-this.xoff+1];
            if(sequences[iseq].type==="peptide"||sequences[iseq].type==="polypeptide(L)"){ 
                t = sequenceAminoOneLetterMap[t];
            }
            const name = sequences[iseq].name;
            const chain = sequences[iseq].chain;
            const re = new RegExp("_"+chain);
            const resNum = ic-this.xoff+2;
            const molName = name.replace(re,"");
            if(this.props.onDoubleClick){
                this.props.onDoubleClick({molName:molName,chain:chain,seqNum:resNum});
            }
        }
    }

    componentDidMount() {
        console.log("SequenceViewer componentDidMount");
        this.context = this.canvasRef.current.getContext('2d', {alpha: false});
        this.draw();
        var rect = this.scrollDivRef.current.getBoundingClientRect();
        this.scrollRef.current.setSize(rect.width,150);
        const self = this;
        self.mouseDown = false;
        this.canvasRef.current.addEventListener("mousedown", function(evt){ self.doMouseDown(evt,self); }, false);
        this.canvasRef.current.addEventListener("mousemove", function(evt){ self.doMouseMove(evt,self); }, false);
        this.canvasRef.current.addEventListener("mouseup", function(evt){ self.doMouseUp(evt,self); }, false);
        this.canvasRef.current.addEventListener("dblclick", this.doubleClickHandler, false);
    }

    doMouseMove(event,self) {
        const ctx = this.context;
        ctx.font = "bold " + this.charHeight+'px Courier';
        const charWidth = Math.ceil(ctx.measureText("M").width);
        var xy = this.getEventXY(event);
        if(xy[0]<10*charWidth) return;
        if(!self.mouseDown){
            const sequences = this.state.sequences;
            var eX = xy[0] + this.state.scrollX;
            var eY = xy[1] + this.state.scrollY;
            var iseq = Math.floor(eY/this.charHeight-1);
            var ic = Math.floor(eX/charWidth-1);
            if(iseq>-1&&iseq<sequences.length&&(ic-this.xoff+1)<sequences[iseq].sequence.length){
                var t = sequences[iseq].sequence[ic-this.xoff+1];
                if(sequences[iseq].type==="peptide"||sequences[iseq].type==="polypeptide(L)"){ 
                    t = sequenceAminoOneLetterMap[t];
                }
                this.props.messageChanged({message:sequences[iseq].name+": "+(ic-this.xoff+2)+" "+t});
            }
            return;
        }
        self.actOnEvent(event,self);
    }

    doMouseUp(event,self){

        const sequences = this.state.sequences;

        var xy = this.getEventXY(event);
        const ctx = this.context;
        const charWidth = Math.ceil(ctx.measureText("M").width);
        var tlx = charWidth*(this.xoff-3);
        let ihit = -1;
        if(xy[0]>=tlx&&xy[0]<tlx+charWidth+3){
            let y = xy[1] + this.state.scrollY;
            for(var iseq=0;iseq<sequences.length;iseq++){
                if(iseq<sequences.length){
                    if(y>(iseq+1)*this.charHeight&&y<(iseq+2)*this.charHeight){
                        ihit = iseq;
                        break;
                    }
                }
            }
            if(ihit>-1){
                const selectedSequences = this.state.selectedSequences;
                const index = selectedSequences.indexOf(iseq);
                if(index>-1){
                    selectedSequences.splice(index, 1);
                } else {
                    selectedSequences.push(iseq);
                }
                this.setState({selectedSequences:selectedSequences}, ()=> { this.draw(); });
            }
            return;
        }

        self.mouseDown = false;

        var selMessage = [];

        for(let iseq=0;iseq<this.selected.length;iseq++){
            var thisSelMessage = [];
            for(let ic=0;ic<this.selected[iseq].length;ic++){
                if(this.selected_temp[iseq][ic]){
                    this.selected[iseq][ic] = true;
                } else if(!event.shiftKey){
                    this.selected[iseq][ic] = false;
                }
                if(this.selected[iseq][ic]){
                    thisSelMessage.push(ic);
                }
            }
            selMessage.push({sel:thisSelMessage,id:sequences[iseq].id});
        }
        this.draw();
        this.props.selectionChanged({selection:selMessage});
    }

    doMouseDown(event,self) {
        var xy = this.getEventXY(event);
        const ctx = this.context;
        const charWidth = Math.ceil(ctx.measureText("M").width);
        var tlx = charWidth*(this.xoff-3);
        let ihit = -1;
        if(xy[0]>=tlx&&xy[0]<tlx+charWidth+3){
            return;
        }
        self.mouseDown = true;
        self.mouseDownButton = event.button;
        this.downX = xy[0] + this.state.scrollX;
        this.downY = xy[1] + this.state.scrollY;
        this.eX = xy[0] + this.state.scrollX;
        this.eY = xy[1] + this.state.scrollY;
        this.select(event.shiftKey);
        this.draw();
    }

    getEventXY(event){
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
        return [x,y];
    }

    actOnEvent(event){
        var xy = this.getEventXY(event);
        this.eX = xy[0] + this.state.scrollX;
        this.eY = xy[1] + this.state.scrollY;
        this.select(event.shiftKey);
        this.draw();
    }

    constructor(props){
        super(props);
        this.xoff = 15;
        this.downX = -1;
        this.downY = -1;
        this.eX = -1;
        this.eY = -1;
        this.canvasRef = createRef();
        this.scrollRef = createRef();
        this.scrollDivRef = createRef();
        this.largeRef = createRef();
        this.state = {scrollX:0,scrollyY:0,sequences:[],selectedSequences:[]};
        this.selected = [];
        this.selected_temp = [];
        this.charHeight = 18;
        if(props.sequences){
            this.state.sequences = props.sequences;
        }
        this.setSelections();
        window.addEventListener('resize', this.handleResize.bind(this));
        const self = this;
        this.doubleClickHandler = function(evt){ self.doMouseDoubleClick(evt,self); }
    }

    setSelections(){
        //FIXME - selected should be in 'state' ?
        this.selected = new Array(this.state.sequences.length);
        this.selected_temp = new Array(this.state.sequences.length);
        let maxLen = 0;
        for(let iseq=0;iseq<this.state.sequences.length;iseq++){
            maxLen = Math.max(maxLen,this.state.sequences[iseq].sequence.length);
            this.selected[iseq] = new Array(this.state.sequences[iseq].sequence.length).fill(false);
            this.selected_temp[iseq] = new Array(this.state.sequences[iseq].sequence.length).fill(false);
        }
        if(this.largeRef.current&&this.context){
            const ctx = this.context;
            ctx.font = "bold " + this.charHeight+'px Courier';
            const charWidth = Math.ceil(ctx.measureText("M").width);
            this.largeRef.current.style.width = ((maxLen+20)*charWidth)+"px";
            this.largeRef.current.style.height = ((this.state.sequences.length+2)*this.charHeight)+"px";
        }
    }

    setSequences(seqs){
        this.setState({ sequences: seqs,selectedSequences:[] }, ()=> {
                this.setSelections();
        });
    }

    addSequences(seqs){
        this.setState({ sequences: [].concat(this.state.sequences,seqs) }, ()=> {
                this.setSelections();
        });
    }

    addSequence(seq){
        this.setState({ sequences: [...this.state.sequences, seq]}, ()=> {
                this.setSelections();
        });
    }

    setScroll(scrollX,scrollY){
        this.setState({scrollX:scrollX,scrollY:scrollY});
    }

    render(){
        if(this.canvasRef.current){
            this.context = this.canvasRef.current.getContext('2d', {alpha: false});
            this.draw();
        }
        this.canvas = <ScrollableCanvas largeRef={this.largeRef} ref={this.scrollRef} onScroll={this.setScroll.bind(this)} canvasRef={this.canvasRef} />;  
        return (<div ref={this.scrollDivRef}>{this.canvas}</div>);
    }
}

export {SequenceViewer};


