import React, { createRef, Component } from 'react';
import Container from 'react-bootstrap/Container';

import './ScrollContainer.css';

class ScrollableCanvasContainer extends Component {

    constructor(props){
        super(props);
        this.contRef = this.props.contRef;
        this.largeRef = this.props.largeRef;
    }

    onScroll(event,self){
        self.props.onScroll(this.contRef.current.scrollLeft,this.contRef.current.scrollTop);
        event.stopPropagation();
        event.preventDefault();
        return false;
    }

    onTouchEnd(event,self){
        event.stopPropagation();
        event.preventDefault();
    }

    onTouchStart(event,self){
        event.stopPropagation();
        event.preventDefault();
    }

    onTouchMove(event,self){
        event.stopPropagation();
        event.preventDefault();
    }

    componentDidMount() {
        if (this.contRef.current === null) {
            return;
        }
        const self = this;
        this.contRef.current.addEventListener("scroll", function(evt){ self.onScroll(evt,self); }, false);
        this.contRef.current.addEventListener("ontouchend", function(evt){ self.onTouchEnd(evt,self); }, false);
        this.contRef.current.addEventListener("ontouchstart", function(evt){ self.onTouchStart(evt,self); }, false);
        this.contRef.current.addEventListener("ontouchmove", function(evt){ self.onTouchMove(evt,self); }, false);
    }
    

    render(){
        return (<>
        <div className="scrollContainer" ref={this.contRef}>
        <div className="largeContainer" ref={this.largeRef} >
        {this.props.children}
        </div>
        </div>
        </>);
    }
}

class ScrollableCanvas extends Component {
    constructor(props){
        super(props);
        this.contRef = createRef();
        this.largeRef = this.props.largeRef;
    }

    onScroll(x,y){
        if (this.props.onScroll === undefined) {
            return;
        }
        this.props.onScroll(x, y);
    }

    setSize(width,dum) {
        var height = this.props.canvasRef.current.height;
        this.props.canvasRef.current.width = width;
        this.contRef.current.width = width;
        this.contRef.current.height = height;
        this.contRef.current.style.width = width+"px";
        this.contRef.current.style.height = height+"px";
        this.props.onScroll(0, 0);
    }

    componentDidMount() {
        const self = this;
    }
    render(){
        return (<ScrollableCanvasContainer largeRef={this.props.largeRef} contRef={this.contRef} onScroll={this.onScroll.bind(this)}><canvas ref={this.props.canvasRef}/></ScrollableCanvasContainer>);
    }
}

export {ScrollableCanvas};
