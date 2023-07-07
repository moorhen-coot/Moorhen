import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Table from 'react-bootstrap/Table';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import Plot from 'react-plotly.js';

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

import { guid } from './guid.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

class NormalModes extends Component {
    constructor(props) {

        super(props);

        this.timerRunning = false;

        const options = {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        };

        const data = {
          datasets: [
            {
              label: 'Theoretical vs Experimental B-values',
              data: [],
              backgroundColor: 'rgba(255, 99, 132, 1)',
            },
          ],
        };

        this.preRef = React.createRef();

//FIXME - isAnimating probably ought to be a property of MGWebGL instance state? Or maybe Main?
        this.state = {selectedEnergy:-1, displacements:{ids:{}}, energies:{ids:{}}, log:"",chartData:data,chartOptions:options, selected:"unk",contourData:{x:[],y:[],z:[],type:'contour',isAnimating:false}};
        this.jobData = {};
        this.message = "";
        const self = this;
        this.myWorkerNMA = new window.Worker('wasm/nma_worker.js');

        this.myWorkerNMA.onmessage = function(e) {
                         let result = document.getElementById("output");
                         if(e.data[0]==="output"){
                             self.message += e.data[1] + "\n";
                             self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
                         //result.innerHTML += e.data[1] + "<br />";
                         }
                         if(e.data[0]==="displacements"){
                             const displayData = self.props.displayData;
                             let key = self.state.selected;
                             if(key==="unk"&&displayData.length>0){
                                 key = displayData[0].id;
                             }
                             const displacements = e.data[1];

                             const changedIds = { ...self.state.displacements.ids, [key] :  displacements};
                             const newIds = { ...self.state.displacements, ids : changedIds };

                             self.setState({displacements:newIds});
                         }
                         if(e.data[0]==="energies"){
                             const displayData = self.props.displayData;
                             let key = self.state.selected;
                             if(key==="unk"&&displayData.length>0){
                                 key = displayData[0].id;
                             }
                             const energies = e.data[1];

                             const changedIds = { ...self.state.energies.ids, [key] :  energies};
                             const newIds = { ...self.state.energies, ids : changedIds };

                             self.setState({energies:newIds});
                         }
                         if(e.data[0]==="result"){
                         //This is then where we decide upon the action
                             self.message += e.data[1] + "\n";
                             self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
                         }
                         if(e.data[0]==="corrMat"){
                             self.setState({contourData:e.data[1]});
                         }
                         if(e.data[0]==="bvalues"){
                             const bvals = e.data[1][0];
                             const exptl_bvals = e.data[1][1];
                             const theo_label = 'Theoretical B-Values';
                             const exptl_label = 'Experimental B-Values';
                             const data = {
                               datasets: [
                                 {
                                   label: theo_label,
                                   data: bvals,
                                   backgroundColor: 'rgba(88, 88, 255, 1)',
                                   borderColor: 'rgba(88, 88, 255, 1)',
                                   showLine:true,
                                 },
                                 {
                                   label: exptl_label,
                                   data: exptl_bvals,
                                   backgroundColor: 'rgba(88, 255, 88, 1)',
                                   borderColor: 'rgba(88, 255, 88, 1)',
                                   showLine:true,
                                 },
                               ],
                             };
                             self.setState({chartData:data})
                         }
        }
    }

    handleAnimate(){
        const self = this;
        const dataFiles = this.props.dataFiles.ids;
        const displayData = this.props.displayData;
        const energy = this.state.selectedEnergy;
        let key = this.state.selected;
        if(key==="unk"&&displayData.length>0){
            key = displayData[0].id;
        }
        if(energy>-1){
            //This is the thing we should tell MGWebGL to animate with via Main animateStateChanged
            if(this.state.isAnimating){
                this.setState({isAnimating:false}, ()=> {this.props.animateStateChanged({animate:false});});
            } else {
                this.setState({isAnimating:true}, ()=> {this.props.animateStateChanged({dataId:key,animate:true,displacements:this.state.displacements.ids[key].modes[energy]});});
            }
        }
    }

    handleNMA(){
        const self = this;
        const dataFiles = self.props.dataFiles.ids;
        const displayData = this.props.displayData;
        let key = self.state.selected;
        if(key==="unk"&&displayData.length>0){
            key = displayData[0].id;
        }
        let nmaInputFileData = null;
        let nmaInputFileNames = null;
        const jobid = guid();
        this.jobData[jobid] = [];
        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            let name = displayData[iobj].name;
            if(data_id===key){
                this.jobData[jobid].push(data_id);
                nmaInputFileData = dataFiles[key].contents;
                const isPDB = dataFiles[key].isPDB;
                if(isPDB){
                    nmaInputFileNames = name+".pdb";
                } else {
                    nmaInputFileNames = name+".cif";
                }
                break;
            }
        }
        if(nmaInputFileData){
            self.myWorkerNMA.postMessage([nmaInputFileData, nmaInputFileNames,jobid]);
        }
    }

    /*
    handleCheckChange(data_id, evt){
        const self = this;
        const changedIds = { ...this.state.selected.ids, [data_id] : evt.target.checked };
        const newIds = { ...this.state.selected, ids : changedIds };
        this.setState({selected:newIds});
    }
    */

    handleRadioFrequencyChange(k,evt){
        const self = this;
        const dataFiles = this.props.dataFiles.ids;
        const displayData = this.props.displayData;
        let key = this.state.selected;
        if(key==="unk"&&displayData.length>0){
            key = displayData[0].id;
        }
        this.setState({selectedEnergy:k});
        this.props.animateStateChanged({animate:false});
        if(this.state.isAnimating&&k>-1){
            this.props.animateStateChanged({dataId:key,animate:true,displacements:this.state.displacements.ids[key].modes[k]});
        }
    }

    handleChange(evt){
        this.setState({selected:evt.target.value});
    }

    render () {
        var self = this;
        const displayData = this.props.displayData;
        let rows = [];
        let modals = [];
        var showModal = this.state.showModal;
        var showAddModal = this.state.showAddModal;

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
        let rows = [];
        let handleNMA = this.handleNMA.bind(self);
        let handleAnimate = this.handleAnimate.bind(self);
        let handleChange = this.handleChange.bind(self);
        let selected = this.state.selected;
        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            let name = displayData[iobj].name;
            let keySup = data_id;
            const keyOption = "nma_"+keySup;
            rows.push(<option key={keyOption} value={keySup}>{name}</option>);
        }
        if(selected==="unk"&&displayData.length>0){
            selected = displayData[0].id;
        }
        const data = this.state.chartData;
        const contourData = this.state.contourData;
        const options = this.state.chartOptions;

        const x = this.state.contourData.x;
        const y = this.state.contourData.y;
        const z = this.state.contourData.z;

        let animate = "Animate";
        if(this.state.isAnimating){
            animate = "Stop animating";
        }

        let energyList = []; 
        const buttonType = "radio";
        const groupName = "energy_group";
        let enableAnimateButton = false;
        if(selected in this.state.energies.ids){
            if(this.state.selectedEnergy>-1) enableAnimateButton = true;
            for(var i=0;i<this.state.energies.ids[selected].length;i++){
                const buttonId = "energy-"+i;
                const buttonLabel = "(" + i.toString() + ") " + this.state.energies.ids[selected][i].toFixed(4);
                energyList.push(
                  <Form.Check
                    type={buttonType}
                    key={buttonId}
                    id={buttonId}
                    name={groupName}
                    label={buttonLabel}
                    onChange={self.handleRadioFrequencyChange.bind(self, i)}
                  />
                );
            }
        }

        return (
                <>
        <Form>
        <Form.Group as={Row} controlId="getnormalmodes">
        <Col>
                <Form.Select value={selected} onChange={handleChange} >
                {rows}
                </Form.Select>
        </Col>
        <Col>
                <Button size="sm" onClick={handleNMA}>Calculate</Button>
        </Col>
        <Col>
                <Button size="sm" onClick={handleAnimate} disabled={!enableAnimateButton}>{animate}</Button>
        </Col>
        </Form.Group>
        </Form>
                <div className="vspace1em"></div>
                <Tabs
                defaultActiveKey="nma-graph"
                transition={true}
                id="nma-tab-example"
                className="mb-3"
                >
                <Tab eventKey="nma-graph" title="Graph">
                <div style={styles.loggraph}>
                <Scatter data={data} options={this.state.chartOptions} />
                </div>
                </Tab>
                <Tab eventKey="nma-textout" title="Output">
                <pre ref={this.preRef} style={styles.logpre}>
                {this.state.log}
                </pre>
                </Tab>
                <Tab eventKey="nma-plotly" title="Correlation Graph">
                <Plot
        data={[
          {
            x: x,
            y: y,
            z: z,
            type: 'contour',
          },
        ]}
        layout={ {width: 420, height: 340, title: 'Cross-correlation Plot'} }

                  />
                </Tab>
                <Tab eventKey="nma-freqs" title="Normal modes">
                <div style={styles.logpre}>
                <Form>
                {energyList}
                </Form>
                </div>
                </Tab>
                </Tabs>
            </>
        );
    }
}
export default NormalModes;
