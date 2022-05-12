import React, { createRef, Component } from 'react';

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

class LightSphere extends Component {

    drawGradient(x,y){
        var c = this.canvasRef.current;

        var c_x = c.width/2;
        var c_y = c.height/2;

        var mysize = Math.min(c.height,c.width);

        //I wish I knew when to do this...
        this.fixContext();

        var data = this.imageData.data;

        for(var j=0;j<c.height;j++){
            for(var i=0;i<c.width;i++){
                if(((c_x-i)*(c_x-i)+(c_y-j)*(c_y-j))<mysize/2*mysize/2&&((c_x-x)*(c_x-x)+(c_y-y)*(c_y-y))<mysize/2*mysize/2){
                    var dist = 1.0-parseFloat((x-i)*(x-i)+(y-j)*(y-j))/(mysize*mysize);
                    if(dist>1) dist = 1;
                    dist = dist * dist * dist * dist;
                    data[j*c.width*4+i*4]   = parseInt(dist * 255);
                    data[j*c.width*4+i*4+1] = parseInt(dist * 255);
                    data[j*c.width*4+i*4+2] = parseInt(dist * 255);
                    data[j*c.width*4+i*4+3] = 255;
                }
            }
        }
        this.context.putImageData(this.imageData,0,0,0,0,this.imageData.width, this.imageData.height);
    }

    draw() {

        var ctx = this.context;
        var c = this.canvasRef.current;

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, c.width, c.height);
        this.drawGradient(c.width/2, c.height/2);
    }

    doMouseMove(event,self) {
        if(!self.mouseDown){
            return;
        }
        self.actOnEvent(event,self);
    }

    doMouseUp(event,self){
        self.mouseDown = false;
    }

    doMouseDown(event,self) {
        self.mouseDown = true;
        self.mouseDownButton = event.button;
        self.actOnEvent(event,self);
    }

    actOnEvent(event,self){
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
        self.drawGradient(x,y);

        var mysize = Math.min(c.height,c.width);

	//FIXME - This fails to account for my canvas not being square.
        var x_2d = (x-c.width*.5)/mysize;
        var y_2d = -(y-c.height*.5)/mysize;
        var z = 0.5*Math.sqrt(Math.max(0,1.0-4.0*(x_2d*x_2d + y_2d*y_2d)));

	this.props.onChange({'x':x_2d,'y':y_2d,'z':z});

        //this.gl.setLightPosition(x_2d,-y_2d,z);
    }


    fixContext() {
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);
    }

    componentDidMount() {
        this.context = this.canvasRef.current.getContext('2d');
        var ctx = this.context;
        this.imageData = ctx.getImageData(0,0,this.canvasRef.current.width, this.canvasRef.current.height);
        this.draw();
        var self = this;
        self.mouseDown = false;
        this.canvasRef.current.addEventListener("mousedown", function(evt){ self.doMouseDown(evt,self); }, false);
        this.canvasRef.current.addEventListener("mousemove", function(evt){ self.doMouseMove(evt,self); }, false);
        this.canvasRef.current.addEventListener("mouseup", function(evt){ self.doMouseUp(evt,self); }, false);
    }

    render() {
        this.canvas = <canvas ref={this.canvasRef} />;  
        return this.canvas;
    }

    constructor(props) {
        super(props);
        this.canvasRef = createRef();
    }
}
export {LightSphere,getOffsetRect};
