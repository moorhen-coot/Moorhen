import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {parsePDB} from './mgMiniMol.js';
import {ScrollableCanvas} from './ScrollableCanvas';

import { guid } from './guid.js';
import Chart from 'chart.js/auto';

const methodInfoScaling = {
    densityFit: 1,
    bVals:100
}

const desiredMethodOrder = [
    'densityFit',
    'bVals'
]

/**
 * Custom pluign to draw bar borders. Only necessary in Firefox.
 */
 const barBorderPlugin = {
    id: 'custom_bar_borders',
    afterDatasetsDraw: (chart, args, options) => {
        const {ctx} = chart;
        ctx.save();
        ctx.lineWidth = 1;
        for(let datasetIndex=0; datasetIndex<chart._metasets.length; datasetIndex++){
          for(let dataPoint=0; dataPoint<chart._metasets[datasetIndex].data.length; dataPoint++){
            ctx.beginPath();
            ctx.rect(chart._metasets[datasetIndex].data[dataPoint].x-chart._metasets[datasetIndex].data[dataPoint].width/2, chart._metasets[datasetIndex].data[dataPoint].y, chart._metasets[datasetIndex].data[dataPoint].width, chart._metasets[datasetIndex].data[dataPoint].height);
            ctx.stroke();
          }
        }
      ctx.restore();
    }
}

class ValidationBarPlot extends Component {

    constructor(props) {
        super(props);
        this.state = {scrollX:0, scrollY:0, plotInfo: null, key:null, selectedMethods:[]};
        this.canvasRef = createRef();
        this.scrollRef = createRef();
        this.scrollDivRef = createRef();
        this.largeRef = createRef();
        window.addEventListener('resize', this.handleResize.bind(this));

        this.chart = null;
        this.barWidth = 24;
        this.baseLine = 75;

    }

    /**
     * Draw validation bar plot with latest data
     */
    draw() {
        if (this.chart){
            this.chart.destroy();
        }
        if (this.state.plotInfo == null || this.state.plotInfo.length === 0 || this.state.selectedMethods.length === 0) {
            return;
        }
       
        const ctx = this.context;
        let chartData = {};

        // First loop to define residue numbers inside chartData object because some methods might output more residues than others
        for(let methodIndex=0; methodIndex<this.state.selectedMethods.length; methodIndex++){
            if (!(this.state.plotInfo[methodIndex])){
                continue;
            }
            for(let residueIndex=0; residueIndex<this.state.plotInfo[methodIndex].length; residueIndex++){
                let seqNum = this.state.plotInfo[methodIndex][residueIndex].seqNum;
                if (!(seqNum in chartData)) {
                    // Initialise arrays with dimensions determined by the number of selected methods and filled with null
                    chartData[seqNum] = {
                        data: Array(this.state.selectedMethods.length).fill(null),
                        backgroundColor: Array(this.state.selectedMethods.length).fill(null),
                        borderColor: Array(this.state.selectedMethods.length).fill(null)
                    };
                }
           }
        }


        // Second loop to populate dictionary
        for(let seqNum in chartData){
            for(let methodIndex=0; methodIndex<this.state.plotInfo.length; methodIndex++){
                if (!(this.state.plotInfo[methodIndex])){
                    continue;
                }
                let residueIndex = this.state.plotInfo[methodIndex].findIndex(item => item.seqNum == seqNum);
                if (residueIndex !== -1){
                    let gFrac = 1.0 - this.state.plotInfo[methodIndex][residueIndex].value / methodInfoScaling[this.state.selectedMethods[methodIndex]];
                    chartData[seqNum].data[methodIndex] = this.state.plotInfo[methodIndex][residueIndex].value / methodInfoScaling[this.state.selectedMethods[methodIndex]];
                    chartData[seqNum].backgroundColor[methodIndex] = 'rgb(255, '+parseInt(256*gFrac)+', 0)';
                    chartData[seqNum].borderColor[methodIndex] = 'black';
                }

            }
        }

        // Third loop to create list of objects passed to chart.js
        let datasets = []
        let labels =  Object.keys(chartData).sort((a, b) => a - b)
        for(let methodIndex=0; methodIndex<this.state.plotInfo.length; methodIndex++){
            datasets.push({
                label: this.state.selectedMethods[methodIndex],
                data: labels.map(seqNum => chartData[seqNum].data[methodIndex]),
                backgroundColor: labels.map(seqNum => chartData[seqNum].backgroundColor[methodIndex]),
                borderWidth: 0,
                clip: false
            })
        }
        
        this.chart = new Chart(ctx, {
                type: 'bar',
                plugins: [barBorderPlugin],
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: '#ddd',
                            borderColor: 'black',
                            borderWidth:1,
                            displayColors: false,
                            titleColor: 'black',
                            bodyColor: 'black',
                            footerColor: 'black',
                            callbacks: {
                                title: this.setTooltipTitle.bind(this),
                            },
                            titleFont: {
                                size:15,
                                family:'serif'
                            },
                            bodyFont: {
                                size:15,
                                family:'serif'
                            },
                            footerFont: {
                                family:'serif'
                            }
                        }
                    },            
                    onClick: this.doMouseClick.bind(this),
                    barThickness: 'flex',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            display:false,
                            stacked: true,
                            ticks: { color: 'black', font:{size:15, family:'serif'}},
                            grid: {
                                display:false,
                                borderWidth: 0
                            }           
                            
                        },
                        x: {
                            beginAtZero: true,
                            display:true,
                            stacked: true,
                            ticks: { color: 'black', font:{size:15, family:'serif'}, maxRotation: 0, minRotation: 0},
                            grid: {
                                display:false,
                                borderWidth: 1,
                                borderColor: 'black'
                            }
                        }

                    }
                }            
            });
            this.chart.update()

    }

    /**
     * Handle mouse click on bars in validation plot
     * @param {event} event 
     * @returns 
     */
    doMouseClick(event) {
        const points = this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (points.length === 0 || this.state.plotInfo.length === 0){
            return;
        }
        if(this.state.plotInfo){
            const resIndex = points[0].index
            const resNum = this.state.plotInfo[0][resIndex].seqNum;
            if(resNum&&resNum>-1){
                if(this.customClickHandler) {
                    const molName = "UNK";
                    this.customClickHandler({
                        hit:resNum,
                        molKey:this.state.key,
                        molName:molName,
                        chain:this.state.plotInfo[0][resIndex].chainId,
                        seqNum:this.state.plotInfo[0][resIndex].seqNum,
                        insCode:this.state.plotInfo[0][resIndex].insCode
                    });
            
                }
            }
        }
    }

    /**
     * Set title of tooltip shown when hovering over bars on the validation
     * @param {*} args 
     * @returns {string} - title of the tooltip
     */
    setTooltipTitle(args){
        if (this.state.plotInfo.length === 0){
            return;
        }
        let title = ''
        let context = args[0]
        if(this.state.plotInfo[0][context.dataIndex].insCode){
            title = this.state.plotInfo[0][context.dataIndex].chainId + "/" + this.state.plotInfo[0][context.dataIndex].seqNum + ":" + this.state.plotInfo[0][context.dataIndex].insCode + "/(" + this.state.plotInfo[0][context.dataIndex].restype + ")";
        } else {
            title = this.state.plotInfo[0][context.dataIndex].chainId + "/" + this.state.plotInfo[0][context.dataIndex].seqNum + "/(" + this.state.plotInfo[0][context.dataIndex].restype + ")";
        }
        return title;
    }

    setScroll(scrollX,scrollY){
        this.setState({scrollX:scrollX,scrollY:scrollY});
    }

    /**
     * Renders scrollable canvas for bar plot in html format
     * @returns {string} - html contents
     */
    render() {
        if(this.canvasRef.current){
            this.context = this.canvasRef.current.getContext('2d', {alpha: false});
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

    /**
     * Update the plot data for the validation bar plot
     * @param {Array} selectedMethods 
     * @param {Array} plotInfo 
     * @param {string} key 
     */
     updatePlotData(selectedMethods, plotInfo, key){
        const self = this;
        let nRes = Math.max(...plotInfo.map(item => item.length));
        this.largeRef.current.style.width = nRes*this.barWidth+"px";
        this.largeRef.current.style.height = "200px";

        this.setState({plotInfo:plotInfo, key:key, selectedMethods:selectedMethods}, ()=>self.draw());
    }
}

class ValidationData extends Component {

    constructor(props) {

        super(props);

        this.plotRef = createRef();

        let dummyData = [];
        this.state = {selected:"unk", mapSelected:"unk",log:"", chainId:"", plotInfo: dummyData, selectedMethods:dummyData};
        this.message = "";
        const self = this;

        this.clickHandler = this.props.clickHandler;

    }
    
    /**
     * Sends a message to crystallography worker as a promise
     * @param {Worker} crystWorker 
     * @param {Object} kwargs 
     */
     postCrystWorkerMessage(crystWorker, kwargs) {
        const messageId = guid();
        return new Promise((resolve, reject) => {
            const messageListener = crystWorker.addEventListener('message', (e) => {
                if (e.data.messageId === messageId) {
                    crystWorker.removeEventListener('message', messageListener);
                    resolve(e);
                }
            })
            crystWorker.postMessage({
                messageId, ...kwargs
            });
        });
    }    

    /**
     * Update contents of plot
     * @param {array} plotData - array with residue information
     * @param {string} key - key for the selected pdb model
     */
     updatePlotData(selectedMethods, plotData, key){
        const self = this;
        self.plotRef.current.customClickHandler = this.clickHandler;
        self.plotRef.current.updatePlotData(selectedMethods, plotData, key);
        this.setState({plotInfo:plotData});

    }
    
    /**
     * Get density fit data and send message with result to crystallography worker
     */
    async getData(){
        const self = this;
        let keyModel = self.state.selected;
        let keyMap = self.state.mapSelected;
        const dataObjectNames = this.props.dataObjectsNames;
        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        const mtzKeys = Object.keys(dataObjectNames.mtzFiles);
        if(pdbKeys.length<1){
            return;
        }
        if(keyModel==="unk"){
            keyModel = pdbKeys[0];
        }
        if(keyMap==="unk"){
            keyMap = mtzKeys[0];
        }
        const jobid = guid();
        const inputData = {method:'validation', jobId:jobid, pdbinKey:keyModel, hklinKey:keyMap, chainId:this.state.chainId, selectedMethods:this.state.selectedMethods};
        let response = await this.postCrystWorkerMessage(self.props.crystWorker, inputData);
        if (response.data.result){
            this.updatePlotData(this.state.selectedMethods, response.data.result, keyModel);
        }
        

    }

    /**
     * Handle model name change by updating widget state
     * @param {Event} evt 
     */
    handleChange(evt){
        const self = this;
        this.setState({selected:evt.target.value}, ()=> self.getData());
    }

    /**
     * Handle map name change by updating widget state
     * @param {Event} evt 
     */
    handleMapChange(evt){
        const self = this;
        this.setState({mapSelected:evt.target.value}, ()=> self.getData());
    }

    handleSubmit(evt){
        evt.preventDefault();
    }

    /**
     * Handle chain name change by updating widget state
     * @param {Event} evt 
     */
     handleChainChange(evt){
        const self = this;
        this.setState({chainId:evt.target.value}, ()=> self.getData());
    }


    /**
     * Handle validation switch change by updating widget state
     * @param {Event} evt 
     */
     handleSwitchChange(evt){
        const self = this;
        let currentlySelectedMethods = this.state.selectedMethods;

        if (evt.target.checked && !(this.state.selectedMethods.includes(evt.target.id))) {
            currentlySelectedMethods.push(evt.target.id);
        } else if (!(evt.target.checked) && this.state.selectedMethods.includes(evt.target.id)) {
            currentlySelectedMethods = this.state.selectedMethods.filter(item => item !== evt.target.id)
        }

        currentlySelectedMethods = desiredMethodOrder.filter(item => currentlySelectedMethods.includes(item))
        this.setState({selectedMethods:currentlySelectedMethods}, () => self.getData());

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
        const displayData = this.props.displayData;
        const liveUpdatingMaps = this.props.liveUpdatingMaps;

        let rows = [];
        let mapRows = [];
        let handleChange = this.handleChange.bind(self);
        let handleMapChange = this.handleMapChange.bind(self);
        let selected = this.state.selected;
        let mapSelected = this.state.mapSelected;

        const mtzRegex = /.mtz$/;
        const pdbRegex = /.pdb$/;
        const entRegex = /.ent$/;

        const dataObjectNames = this.props.dataObjectsNames;

        const pdbKeys = Object.keys(dataObjectNames.pdbFiles);
        for(let iobj=0;iobj<pdbKeys.length;iobj++){
            const data_id = pdbKeys[iobj];
            const name = dataObjectNames.pdbFiles[data_id].originalFileName;
            const keySup = data_id;
            const keyOption = "rsr_"+keySup;
            const shortName = name.replace(pdbRegex,"");
            rows.push(<option key={keyOption} value={keySup}>{shortName}</option>);
        }

        const mtzKeys = Object.keys(dataObjectNames.mtzFiles);
        for(let iobj=0;iobj<mtzKeys.length;iobj++){
            const data_id = mtzKeys[iobj];
            const name = dataObjectNames.mtzFiles[data_id].originalFileName;
            const keySup = data_id;
            const keyOption = "rsr_"+keySup;
            const shortName = name.replace(mtzRegex,"");
            mapRows.push(<option key={keyOption} value={keySup}>{shortName}</option>);
        }

        if(selected==="unk"&&pdbKeys.length>0){
            selected = pdbKeys[0];
        }

        if(mapSelected==="unk"&&mtzKeys.length>0){
            mapSelected = mtzKeys[0];
        }

        //TODO - Need to introspect the pdb file to see what chains exist and pick the first one ...

        return (
                <>
        <Form onSubmit={this.handleSubmit.bind(this)}>
        <Form.Group as={Row} controlId="resData">
        <Col>
                <Form.Select value={selected} onChange={handleChange} >
                {rows}
                </Form.Select>
        </Col>
        <Col>
        <Form.Control required type="text" onChange={this.handleChainChange.bind(this)} placeholder="Chain id" value={this.state.chainId} />
        </Col>
        <Col>
                <Form.Select value={mapSelected} onChange={handleMapChange} >
                {mapRows}
                </Form.Select>
        </Col>
        </Form.Group>
        <Form.Group as={Row} controlId="validation-switches">
            <Col>
            <Form.Check
                    inline
                    type="switch"
                    id="densityFit"
                    label="Density Fit"
                    onChange={this.handleSwitchChange.bind(this)}
                />
                <Form.Check
                    inline
                    type="switch"
                    id="bVals"
                    label="Bfactors"
                    onChange={this.handleSwitchChange.bind(this)}
                />
            </Col>
        </Form.Group>
        </Form>
        <div className="vspace1em"></div>
        <ValidationBarPlot ref={this.plotRef} />
        </>
        );
    }
}
export default ValidationData;
