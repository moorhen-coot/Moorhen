import React, { Component, createRef } from 'react';

import Table from 'react-bootstrap/Table';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

class DisplayTable extends Component {
    constructor(props) {
        super(props);
        this.state = {selected:{ids:{}}};
        this.myWorkerSSM = new window.Worker('wasm/superpose_worker.js');

        this.myWorkerSSM.onmessage = function(e) {
                         let result = document.getElementById("output");
                         if(e.data[0]==="output"){
                             console.log(e.data[1]);
                         //result.innerHTML += e.data[1] + "<br />";
                         }
                         if(e.data[0]==="result"){
                             console.log(e.data[1]);
                         //result.innerHTML += "<b>Result: " + e.data[1] + "</b><br />";
                         //This is then where we decide upon the action
                         }
                         /*
                         if(e.data[0]==="csvResult"){
                         const cvsResult = e.data[1];
                         const alignData = cvsResult["alignData"];
                         const transformMatrices = cvsResult["transformMatrices"];
                         const data = {
                             datasets: [{
                             label: "Gesamt results",
                                    showLine: true,
                                    backgroundColor: "rgb(75, 0, 192)",
                                    borderColor: 'rgb(75, 192, 192)',
                                    data: alignData,
                                    lineTension: 0.1,
                                    bezierCurve: true,
                                    fill:true
                                       }]
                                                      };
                                                      const config = {
                             type: 'scatter',
                                   data: data,
                         };
                         if(gesamtChart!=null){
                             gesamtChart.destroy();
                         }
                         gesamtChart = new Chart(ctx, config);
                         }
                         */
                         //result.scrollTop = result.scrollHeight;
        }
    }

    handleSuperpose(){
        const self = this;
        const dataFiles = self.props.dataFiles.ids;
        const displayData = this.props.displayData;
        let checked = self.state.selected.ids;
        let superposeInputFileData = [];
        let superposeInputFileNames = [];
        for (const [key, value] of Object.entries(checked)) {
            if(value){
                for(let iobj=0;iobj<displayData.length;iobj++){
                    let data_id = displayData[iobj].id;
                    let name = displayData[iobj].name;
                    if(data_id===key){
                        superposeInputFileData.push(dataFiles[key].contents);
                        const isPDB = dataFiles[key].isPDB;
                        if(isPDB){
                            superposeInputFileNames.push(name+".pdb");
                        } else {
                            superposeInputFileNames.push(name+".cif");
                        }
                    }
                }
            }
        }
        //TODO - Get the actual file data and then superpose.
        console.log(superposeInputFileNames);
        console.log(superposeInputFileData);
        self.myWorkerSSM.postMessage([superposeInputFileData, superposeInputFileNames]);
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
        const self = this;
        const displayData = this.props.displayData;
        let rows = [];
        let handleSuperpose = this.handleSuperpose.bind(self);
        for(let iobj=0;iobj<displayData.length;iobj++){
            let data_id = displayData[iobj].id;
            let name = displayData[iobj].name;
            let keySup = "sup_"+data_id;
            rows.push(<tr key={iobj}><td>{name}</td>
            <td key={keySup}><input type="checkbox" onChange={(evt) => this.handleCheckChange(data_id, evt)}/></td>
            </tr>
            );
        }
        return (
                <>
                <Table responsive>
                <tbody>
                {rows}
                </tbody>
                </Table>
                <Button size="sm" onClick={handleSuperpose}>Superpose</Button>
            </>
        );
    }
}
export default DisplayTable;
