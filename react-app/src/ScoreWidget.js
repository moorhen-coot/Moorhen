import React, { createRef, Component } from 'react';

class Canvas extends Component {
  
  draw() {
    this.context.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);

    var ctx = this.context;
    var c = this.canvasRef.current;

    ctx.clearRect(0, 0, c.width, c.height);

    var ox = c.width*this.origin_x_frac;
    var oy = c.height*this.origin_y_frac;
    var outer_radius = c.height*this.outer_frac;
    var inner_radius = c.height*this.inner_frac;
    var pointer_radius = 0.5*(inner_radius+outer_radius);
    var pointer_size = c.height*this.pointer_frac;
    //"start" is misleading here as it means when going backwards.
    var yellow_start = this.arc_start*this.green_threshold + this.arc_end*(1.0-this.green_threshold);
    var red_start = this.arc_start*this.yellow_threshold + this.arc_end*(1.0-this.yellow_threshold);

    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(ox, oy, outer_radius, red_start, this.arc_end, true);
    ctx.arc(ox, oy, inner_radius,  this.arc_end, red_start, false);
    ctx.arc(ox, oy, outer_radius,  red_start, this.arc_end, true);
    ctx.fill();

    ctx.strokeStyle = 'yellow';
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(ox, oy, outer_radius, yellow_start, red_start, true);
    ctx.arc(ox, oy, inner_radius,  red_start, yellow_start, false);
    ctx.arc(ox, oy, outer_radius,  yellow_start, red_start, true);
    ctx.fill();

    ctx.strokeStyle = 'green';
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(ox, oy, outer_radius, this.arc_start, yellow_start, true);
    ctx.arc(ox, oy, inner_radius,  yellow_start, this.arc_start, false);
    ctx.arc(ox, oy, outer_radius,  this.arc_start, yellow_start, true);
    ctx.fill();

    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(ox, oy, outer_radius, this.arc_start, this.arc_end, true);
    ctx.arc(ox, oy, inner_radius,  this.arc_end, this.arc_start, false);
    ctx.arc(ox, oy, outer_radius,  this.arc_start, this.arc_end, true);
    ctx.stroke();

    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(ox, oy, outer_radius, this.arc_start, this.arc_end, true);
    ctx.arc(ox, oy, inner_radius,  this.arc_end, this.arc_start, false);
    ctx.arc(ox, oy, outer_radius,  this.arc_start, this.arc_end, true);
    ctx.stroke();

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    var angle = this.score * this.arc_start + (1.0-this.score) * this.arc_end;
    var fluct_angle = Math.PI/2. + angle;
    var fluct_anglep = 3*Math.PI/2. + angle;
    var x = pointer_radius * Math.cos(angle);
    var y = pointer_radius * Math.sin(angle);
    var fluct_x = pointer_size * Math.cos(fluct_angle);
    var fluct_y = pointer_size * Math.sin(fluct_angle);
    var fluct_xp = pointer_size * Math.cos(fluct_anglep);
    var fluct_yp = pointer_size * Math.sin(fluct_anglep);
    ctx.beginPath();
    ctx.moveTo(ox+fluct_x,oy+fluct_y);
    ctx.lineTo(x+ox,y+oy);
    ctx.lineTo(ox+fluct_xp,oy+fluct_yp);
    ctx.lineTo(ox+fluct_x,oy+fluct_y);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ox, oy, pointer_size,  0.0, 2.*Math.PI);
    ctx.fill();

  }

  componentDidMount() {
    this.context = this.canvasRef.current.getContext('2d');
    this.draw();
  }

  render() {
    this.score = this.props.score;
    if(this.canvasRef.current){
        this.context = this.canvasRef.current.getContext('2d');
        this.draw();
    }
    this.canvas = <canvas ref={this.canvasRef} />;  
    //const { width, height } = canvas.getBoundingClientRect();
    return this.canvas;
  }
  
  constructor(props) {
    super(props);
    this.canvasRef = createRef();

    this.arc_start = -Math.PI/6.;
    this.arc_end = -Math.PI*5./6.;
    this.inner_frac = 0.4;
    this.outer_frac = 0.7;
    this.pointer_frac = 0.03;
    this.green_threshold = 0.66;
    this.yellow_threshold = 0.33;
    this.origin_x_frac = 0.5;
    this.origin_y_frac = 0.8;

    this.score = this.props.score;

  }
  
}

export default Canvas;
