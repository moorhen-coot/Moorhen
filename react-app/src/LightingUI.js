import React, { Component } from 'react';

import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import FormRange from 'react-bootstrap/FormRange';

import {LightSphere} from './LightSphere';
import SketchExample from './SketchExample';

class LightingUI extends Component {

    parametersChanged() {
        try {
            this.props.onChange(this.state);
        } catch(e) {
            //Ignore
        }
    }

    ambientColorChanged(evt,stuff) {
        this.setState({ambientColor:evt},()=> {this.parametersChanged(); });
    }

    specularColorChanged(evt,stuff) {
        this.setState({specularColor:evt},()=> {this.parametersChanged(); });
    }

    diffuseColorChanged(evt,stuff) {
        this.setState({diffuseColor:evt},()=> {this.parametersChanged(); });
    }

    ambientChanged(evt,stuff) {
        this.setState({ambient : evt.target.value},()=> {this.parametersChanged(); });
    }

    fogChanged(vals) {
        this.setState({fog : {near:vals.min, far:vals.max}},()=> {this.parametersChanged(); });
    }

    fogNearChanged(evt,stuff) {
        this.setState({fog : {near:evt.target.value, far:this.state.fog.far}},()=> {this.parametersChanged(); });
    }

    fogFarChanged(evt,stuff) {
        this.setState({fog : {far:evt.target.value, near:this.state.fog.near}},()=> {this.parametersChanged(); });
    }

    slabWidthChanged(evt,stuff) {
        this.setState({slab : {width:evt.target.value, position:this.state.slab.position}},()=> {this.parametersChanged(); });
    }

    slabPositionChanged(evt,stuff) {
        this.setState({slab : {position:evt.target.value, width:this.state.slab.width}},()=> {this.parametersChanged(); });
    }

    specularChanged(evt,stuff) {
        this.setState({specular : evt.target.value},()=> {this.parametersChanged(); });
    }

    diffuseChanged(evt,stuff) {
        this.setState({diffuse : evt.target.value},()=> {this.parametersChanged(); });
    }

    positionChanged(position,stuff) {
        this.setState({position :  position},()=> {this.parametersChanged()});
    }

    backgroundColorChanged(evt,stuff) {
        this.setState({bgcolor:evt},()=> {this.parametersChanged()});
    }

    constructor(props) {
        super(props);
        var ambRGB = {r:255, g:255, b:255, a:1};
        var diffRGB = {r:255, g:255, b:255, a:1};
        var specRGB = {r:255, g:255, b:255, a:1};
        var bgcolor = {r:255, g:255, b:255, a:1};
        this.state = {bgcolor:bgcolor, ambient:0, specular:100, diffuse: 100, position : {x:0,y:0,z:0.5}, specularColor:specRGB, ambientColor:ambRGB, diffuseColor:diffRGB, fog:{near:0,far:1000}, slab:{width:500,position:0}};

        this.fogChanged = this.fogChanged.bind(this);
    }

    render() {
        var self = this;
        var ambient = this.state.ambient;
        var specular = this.state.specular;
        var diffuse = this.state.diffuse;
        var slab = this.state.slab;
        var fog = this.state.fog;
        return (
        <Container>
        <Row>
	  <Col>
	    <LightSphere onChange={function(evt){self.positionChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>Ambient</Col>
	  <Col>
	    <FormRange value={ambient} onChange={function(evt){self.ambientChanged(evt,self)}} />
	  </Col>
	  <Col>
	    <SketchExample onChange={function(evt){self.ambientColorChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>Specular</Col>
	  <Col>
	    <FormRange value={specular} onChange={function(evt){self.specularChanged(evt,self)}} />
	  </Col>
	  <Col>
	    <SketchExample onChange={function(evt){self.specularColorChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>Diffuse</Col>
	  <Col>
	    <FormRange value={diffuse} onChange={function(evt){self.diffuseChanged(evt,self)}} />
	  </Col>
	  <Col>
	    <SketchExample onChange={function(evt){self.diffuseColorChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>Slab width</Col>
	  <Col>
	    <FormRange value={slab.width} onChange={function(evt){self.slabWidthChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>Slab position</Col>
	  <Col>
	    <FormRange min={-500} max={500} value={slab.position} onChange={function(evt){self.slabPositionChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>Fog start</Col>
	  <Col>
	    <FormRange min={-500} max={500} value={fog.near} onChange={function(evt){self.fogNearChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>Fog end</Col>
	  <Col>
	    <FormRange min={-500} max={500} value={fog.far} onChange={function(evt){self.fogFarChanged(evt,self)}} />
	  </Col>
	</Row>
	<Row>
	  <Col>
          Background colour
	  </Col>
	  <Col>
	    <SketchExample onChange={function(evt){self.backgroundColorChanged(evt,self)}} />
	  </Col>
	</Row>
        </Container>);
    }
}

export default LightingUI;

