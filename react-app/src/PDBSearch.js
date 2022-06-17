import React from 'react'
import reactCSS from 'reactcss'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import pako from 'pako';

import {parseMMCIF} from './mgMiniMol.js';

const Spacer = props => {
  return (
    <div style={{height:props.height}}></div>
  );
}

class PDBSearch extends React.Component {
    constructor(props){
        super(props);
        this.state = { searchString:"", results:{}, selected:{ids:{}} };
    }

    handeleSearchChange(e){
        this.setState({searchString: e.target.value, selected:{ids:{}}});
    }

    handleSelectedIDChange(pdb_id,evt){
        const self = this;
        const changedIds = { ...this.state.selected.ids, [pdb_id] : evt.target.checked };
        const newIds = { ...this.state.selected, ids : changedIds };
        this.setState({selected:newIds});
    }

    handleDownload(){
        //TODO - Need a way to load multiple files at once. I am not convinced by the "pending" stuff in MGWebWizardUI.
        const self = this;
        let checked = self.state.selected.ids;
        //let promises = [];
        for (const [key, value] of Object.entries(checked)) {
            if(value){
                console.log("Download",key);
                let theUrl = "https://files.rcsb.org/download/"+key.toUpperCase()+".cif.gz";
                //promises.push(fetch(theUrl));
                fetch(theUrl).then(response => {
                    return response.blob();
                 }).then(data => {
                    new Response(data).arrayBuffer()
                    .then(arrayBuffer => {
                        console.log(key);
                        const codeddata  = pako.inflate(arrayBuffer);
                        let decoder = new TextDecoder('utf-8');
                        let strData = decoder.decode(codeddata);
                        const dataSplit = strData.split("\n");
                        const cifatoms = parseMMCIF(dataSplit,key);
                        const pending = {fileData:strData,atoms:cifatoms,wizard:"Bonds",name:key};
                        this.props.onChange(pending);
                    });
                }).catch(error => {
                    console.error(error);
                });
            }
        }
        /*
        // This would wait for them all; we would then loop over "result". Interesting, but probably not what I want?
        if(promises.length>0){
            Promise.all(promises).then(responses => {
                Promise.all(responses.map(res => res.blob()))
                .then(result => {
                    console.log(result);
                })
            }).catch((error) => {
                console.error(error);
            });
        }
        */
    }

    submitHandler (e) {
        e.preventDefault();
        this.handleSubmit();
    }

    handleSubmit(){

        const url = "https://search.rcsb.org/rcsbsearch/v1/query";

        const theSearchString = {
            "query": {
                "type": "terminal",
                "service": "full_text",
                "parameters": {
                    "value": this.state.searchString
                }
            },
            "return_type": "entry"
        };
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(theSearchString)
        };
        fetch(url, requestOptions)
            .then(response => {
                if(response.ok){
                    return response.json();
                }
                throw response;
            })
            .then(data => {
                this.setState({results:data});
            })
            .catch(error => {
                console.error(error);
                this.setState({results:{}});
            })
            ;

    }

    render() {
        const styles = reactCSS({
            'default': {
                'logpre': {
                     'padding': '10px',
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

        let resultsList = []; 

        const groupName = "pdb_search_group";
        const buttonType = "check";
        const self = this;
        if("result_set" in this.state.results){
            for(let i=0;i<this.state.results.result_set.length;i++){
                const buttonId = "pdbsearch-"+this.state.searchString.replace(" ","_")+"-"+i;
                const buttonLabel = this.state.results.result_set[i].identifier + " (" + parseFloat(this.state.results.result_set[i].score).toFixed(3) + ")";
                resultsList.push(
                  <Form.Check
                    key={buttonId}
                    id={buttonId}
                    name={groupName}
                    label={buttonLabel}
                    onChange={self.handleSelectedIDChange.bind(self, this.state.results.result_set[i].identifier)}
                  />
                );
            }
        }
        const handeleSearchChange = this.handeleSearchChange.bind(this);
        const handleSubmit = this.handleSubmit.bind(this);
        const handleDownload = this.handleDownload.bind(this);
        let someSelected = false;

        let checked = self.state.selected.ids;
        for (const [key, value] of Object.entries(checked)) {
            if(value){
                someSelected = true;
                break;
            }
        }

        return (
        <>
        <Form onSubmit={this.submitHandler.bind(this)} >
        <Spacer height="1rem" />
        <Form.Group as={Row} controlId="searchpdb">
        <Col>
        <Form.Control type="text" onChange={this.handeleSearchChange.bind(this)} placeholder="Search string" value={this.state.searchString} />
        </Col>
        <Col>
        <Button variant="primary" onClick={handleSubmit}>Search</Button>
        </Col>
        <Col>
        <Button variant="primary" onClick={handleDownload} disabled={!someSelected}>Download</Button>
        </Col>
        </Form.Group>
        <Spacer height="1rem" />
        </Form>
        <div style={styles.logpre}>
        <Form>
        {resultsList}
        </Form>
        </div>
        </>
        )
    }
}
export default PDBSearch;

