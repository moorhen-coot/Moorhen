import React from 'react'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

const Spacer = props => {
  return (
    <div style={{height:props.height}}></div>
  );
}

class PDBSearch extends React.Component {
    constructor(props){
        super(props);
        this.state = { searchString:"" };
    }

    handeleSearchChange(e){
        this.setState({searchString: e.target.value});
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
                console.log(data)
            })
            .catch(error => {
                console.error(error);
            })
            ;

    }

    render() {
        const handeleSearchChange = this.handeleSearchChange.bind(this);
        const handleSubmit = this.handleSubmit.bind(this);
        return (
        <>
        <Form>
        <Spacer height="1rem" />
        <Form.Group as={Row} controlId="searchpdb">
        <Col>
        <Form.Control type="text" onChange={this.handeleSearchChange.bind(this)} placeholder="Search string" value={this.state.searchString} />
        </Col>
        </Form.Group>
        <Spacer height="1rem" />
        <Button  variant="primary" size="sm" onClick={handleSubmit}>Search</Button>
        </Form>
        </>
        )
    }
}
export default PDBSearch;

