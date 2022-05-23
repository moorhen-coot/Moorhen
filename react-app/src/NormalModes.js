import React, { Component, createRef } from 'react';
import reactCSS from 'reactcss'

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Table from 'react-bootstrap/Table';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

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

class DisplayTable extends Component {
    constructor(props) {

        super(props);

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

        this.state = {selected:{ids:{}},log:"",chartData:data,chartOptions:options};
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
                         if(e.data[0]==="result"){
                         //This is then where we decide upon the action
                             self.message += e.data[1] + "\n";
                             self.setState({log:self.message}, ()=> {self.preRef.current.scrollTop = self.preRef.current.scrollHeight;});
                         }
                         if(e.data[0]==="bvalues"){
                             console.log(e.data[1]);
                         }
                         if(e.data[0]==="bvalues"){
                             const bvals = e.data[1];
                             const label = 'Theoretical B-Values (unscaled)';
                             const data = {
                               datasets: [
                                 {
                                   label: label,
                                   data: bvals,
                                   backgroundColor: 'rgba(255, 99, 132, 1)',
                                 },
                               ],
                             };

                             self.setState({chartData:data});
                         }
        }
    }

    handleNMA(){
        const self = this;
        const dataFiles = self.props.dataFiles.ids;
        const displayData = this.props.displayData;
        let checked = self.state.selected.ids;
        let nmaInputFileData = null;
        let nmaInputFileNames = null;
        const jobid = guid();
        this.jobData[jobid] = [];
        for (const [key, value] of Object.entries(checked)) {
            if(value){
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
                        //FIXME - This loop is pointless - we want exactly one input.
                        break;
                    }
                }
            }
        }
        if(nmaInputFileData){
            self.myWorkerNMA.postMessage([nmaInputFileData, nmaInputFileNames,jobid]);
        }
    }

    handleCheckChange(data_id, evt){
        const self = this;
        const changedIds = { ...this.state.selected.ids, [data_id] : evt.target.checked };
        const newIds = { ...this.state.selected, ids : changedIds };
        this.setState({selected:newIds});
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
        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            let name = displayData[iobj].name;
            let keySup = "sup_"+data_id;
            rows.push(<tr key={iobj}><td>{name}</td>
            <td key={keySup}><input type="checkbox" onChange={(evt) => this.handleCheckChange(data_id, evt)}/></td>
            </tr>
            );
        }
        const data = this.state.chartData;
        const options = this.state.chartOptions;
        return (
                <>
                <Table responsive>
                <tbody>
                {rows}
                </tbody>
                </Table>
                <Button size="sm" onClick={handleNMA}>Calculate normal modes</Button>
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
                </Tabs>
            </>
        );
    }
}
export default DisplayTable;
