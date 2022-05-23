import React, { Component } from 'react';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import LightingUI from './LightingUI';
import MGWebWizardUI from './MGWebWizardUI';
import DisplayTable from './DisplayTable';
import Superpose from './Superpose';
import NormalModes from './NormalModes';

class ControlInterface extends Component {

    constructor(props) {
        super(props);
        this.state = {};
        this.state.enerLib = this.props.enerLib;
    }

    svgChanged(params) {
	this.props.svgChange(params);
    }

    filePendingChanged(params) {
	this.props.filePendingChange({pending:params});
    }

    lightsChanged(params) {
	this.props.lightsChange({lights:params});
    }

    addRequested(data) {
	this.props.addRequest(data);
    }

    matricesChanged(data) {
	this.props.matricesChanged(data);
    }

    deleteRequested(data_id) {
	this.props.deleteRequest(data_id);
    }

    visibilityChanged(visStateInfo) {
	this.props.visibilityChange(visStateInfo);
    }

    render () {
        const enerLib = this.state.enerLib;
        const displayData = this.props.displayData;
        const dataFiles = this.props.dataFiles;
        return (
                <Tabs
                defaultActiveKey="home"
                transition={false}
                id="noanim-tab-example"
                className="mb-3"
                >
                <Tab eventKey="home" title="Files/style">
                <MGWebWizardUI  enerLib={enerLib} onSVGChange={this.svgChanged.bind(this)} onChange={this.filePendingChanged.bind(this)} />
                </Tab>
                <Tab eventKey="lighting" title="Lighting">
                <LightingUI onChange={this.lightsChanged.bind(this)}/>
                </Tab>
                <Tab eventKey="displayTable" title="Display Table">
                <DisplayTable visibilityChanged={this.visibilityChanged.bind(this)} addRequest={this.addRequested.bind(this)} deleteRequest={this.deleteRequested.bind(this)} displayData={displayData} />
                </Tab>
                <Tab eventKey="superpose" title="Superposition">
                <Superpose displayData={displayData} dataFiles={dataFiles} matricesChanged={this.matricesChanged.bind(this)} />
                </Tab>
                <Tab eventKey="normalmodes" title="Normal mode analysis">
                <NormalModes displayData={displayData} dataFiles={dataFiles} />
                </Tab>
                </Tabs>
               );
    }
}

export default ControlInterface;
