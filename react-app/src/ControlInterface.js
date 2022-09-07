import React, { Component } from 'react';
import reactCSS from 'reactcss'

import parse, { domToReact, } from 'html-react-parser';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Table from 'react-bootstrap/Table';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import LightingUI from './LightingUI';
import MGWebWizardUI from './MGWebWizardUI';
import DisplayTable from './DisplayTable';
import Superpose from './Superpose';
import MiniRSR from './MiniRSR';
import FlipPeptide from './FlipPeptide';
import NormalModes from './NormalModes';
import Utilities from './MGUtils';

function rowStyleFormat(row, rowIdx) {
    return { backgroundColor: rowIdx % 2 === 0 ? 'red' : 'blue' };
}

class ControlInterface extends Component {

    constructor(props) {
        super(props);
        this.state = { svg: parse("<div />"), svgInfo: { ids: {} }, };
        this.state.enerLib = this.props.enerLib;
    }

    svgChanged(params) {
        //this.props.svgChange(params);
        //console.log(params);
        let message = "";
        let data = params.svg;
        for (let ilig = 0; ilig < Object.keys(data).length; ilig++) {
            let svg = data[Object.keys(data)[ilig]];
            message += svg + Object.keys(data)[ilig];
        }
        this.setState({ svg: parse(message) });
    }

    glycanChanged(params) {
        //this.props.glycanChange(params);
        for (let isvg = 0; isvg < Object.keys(params.glycans).length; isvg++) {
            const svg = params.glycans[Object.keys(params.glycans)[isvg]];
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(svg, "application/xml");
            let glycanNodes = xmlDoc.getElementsByTagName("glycan");
            let svgDict = {};
            for (let iglycan = 0; iglycan < glycanNodes.length; iglycan++) {
                let glycanNode = glycanNodes[iglycan];
                let theChain = "unk";
                for (let iattr = 0; iattr < glycanNode.attributes.length; iattr++) {
                    if (glycanNode.attributes[iattr].name === "chain") {
                        theChain = glycanNode.attributes[iattr].value;
                    }
                }
                if (theChain in svgDict) {
                    svgDict[theChain].push(glycanNode);
                } else {
                    svgDict[theChain] = [glycanNode];
                }
            }
            const theKey = Object.keys(params.glycans);
            const changedIds = { ...this.state.svgInfo.ids, [theKey]: svgDict };
            const newIds = { ...this.state.svgInfo, ids: changedIds };

            this.setState({ svgInfo: newIds });

        }
    }

    mapChanged(params) {
        this.props.mapChanged(params);
    }

    filePendingChanged(params) {
        this.props.filePendingChange({ pending: params });
    }

    lightsChanged(params) {
        this.props.lightsChange({ lights: params });
    }

    addRequested(data) {
        this.props.addRequest(data);
    }

    animateStateChanged(data) {
        this.props.animateStateChanged(data);
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

    onSVGClick(m) {
        this.props.svgClicked(m);
    }

    helicesChanged(params) {
        this.props.filePendingChange({ pending: params.pending });
    }

    render() {

        const enerLib = this.state.enerLib;
        const displayData = this.props.displayData;
        const liveUpdatingMaps = this.props.liveUpdatingMaps;
        const mapDataFiles = this.props.mapDataFiles;
        const dataFiles = this.props.dataFiles;
        const styles = reactCSS({
            'default': {
                'ligands': {
                    'margin': '10px',
                    'height': '300px',
                    'overflowX': 'auto',
                    'overflowY': 'scroll',
                },
            },
        });

        let rows = [];
        let irow = 0;
        const className = 'clickableSvg';
        const onSVGClick = this.onSVGClick.bind(this);
        for (let isvg = 0; isvg < Object.keys(this.state.svgInfo.ids).length; isvg++) {
            let theKey = Object.keys(this.state.svgInfo.ids)[isvg];
            let svgDict = this.state.svgInfo.ids[theKey];
            let keys = Object.keys(svgDict);
            keys.sort();
            for (let ik = 0; ik < keys.length; ik++) {
                let chain = keys[ik];
                for (let icg = 0; icg < svgDict[chain].length; icg++) {
                    let glycanNode = svgDict[chain][icg];
                    let graphicsNodes = glycanNode.getElementsByTagName("svg_graphics");
                    let sugarNodes = glycanNode.getElementsByTagName("sugar");
                    for (let ign = 0; ign < graphicsNodes.length; ign++) {
                        let graphicsNode = graphicsNodes[ign].getElementsByTagName("svg")[0];
                        let anchorNodes = graphicsNode.getElementsByTagName("a");
                        let sugarNode = sugarNodes[ign];

                        let newSvg = parse((new XMLSerializer()).serializeToString(graphicsNode), {
                            replace: domNode => {
                                if (domNode.name === 'a') {
                                    delete domNode.attribs.onclick;
                                    const hrefText = domNode.attribs["xlink:href"];
                                    const clickMessage = { hrefText: hrefText, key: theKey };
                                    return (
                                        <a
                                            {...domNode.attribs}
                                            onClick={() => onSVGClick({ clickMessage })}
                                            className={className}
                                        >
                                            {domToReact(domNode.children)}
                                        </a>
                                    );
                                } else {
                                    return domNode;
                                }
                            }
                        });

                        let typeText = sugarNode.getElementsByTagName("detected_type")[0].innerHTML;
                        let QText = sugarNode.getElementsByTagName("cremer-pople_Q")[0].innerHTML;
                        let PhiText = sugarNode.getElementsByTagName("cremer-pople_Phi")[0].innerHTML;
                        let ThetaText = sugarNode.getElementsByTagName("cremer-pople_Theta")[0].innerHTML;
                        let BFacText = sugarNode.getElementsByTagName("mean_bfactor")[0].innerHTML;
                        let ConfText = sugarNode.getElementsByTagName("conformation")[0].innerHTML;
                        let AnomerText = sugarNode.getElementsByTagName("anomer")[0].innerHTML;
                        let rowKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign;
                        let picRowKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_PicPow";
                        let TypeKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_Type";
                        let QKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_Q";
                        let PhiKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_Phi";
                        let ThetaKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_Theta";
                        let BFacKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_BFac";
                        let ConfKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_Conf";
                        let AnomerKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_Anomer";
                        let PicKey = "key_" + theKey + "_" + chain + "_" + icg + "_" + ign + "_Pic";
                        let rowStyle;
                        if (irow % 2) {
                            rowStyle = { backgroundColor: '#ccccff' };
                        } else {
                            rowStyle = { backgroundColor: '#eeeeff' };
                        }
                        rows.push(<tr style={rowStyle} key={picRowKey}>
                            <td key={PicKey} colSpan="7">{newSvg}</td>
                        </tr>);
                        rows.push(<tr style={rowStyle} key={rowKey}>
                            <td key={TypeKey}>{typeText}</td>
                            <td key={QKey}>{QText}</td>
                            <td key={PhiKey}>{PhiText}</td>
                            <td key={ThetaKey}>{ThetaText}</td>
                            <td key={BFacKey}>{BFacText}</td>
                            <td key={ConfKey}>{ConfText}</td>
                            <td key={AnomerKey}>{AnomerText}</td>
                        </tr>);
                        irow++;
                    }
                }
            }
        }

        return (
            <Tabs
                defaultActiveKey="home"
                transition={false}
                id="noanim-tab-example"
                className="mb-3"
            >
                <Tab eventKey="home" title="Files/style">
                    <MGWebWizardUI sharedArrayBuffer={this.props.sharedArrayBuffer} crystWorker={this.props.crystWorker} enerLib={enerLib} onGlycanChange={this.glycanChanged.bind(this)} onSVGChange={this.svgChanged.bind(this)} onChange={this.filePendingChanged.bind(this)} mapChanged={this.mapChanged.bind(this)} />
                </Tab>
                <Tab eventKey="lighting" title="Lighting">
                    <LightingUI onChange={this.lightsChanged.bind(this)} />
                </Tab>
                <Tab eventKey="displayTable" title="Display Table">
                    <DisplayTable visibilityChanged={this.visibilityChanged.bind(this)} addRequest={this.addRequested.bind(this)} deleteRequest={this.deleteRequested.bind(this)} liveUpdatingMaps={liveUpdatingMaps} displayData={displayData} mapDataFiles={mapDataFiles} />
                </Tab>
                <Tab eventKey="superpose" title="Superposition">
                    <Superpose displayData={displayData} dataFiles={dataFiles} matricesChanged={this.matricesChanged.bind(this)} />
                </Tab>
                <Tab eventKey="normalmodes" title="Normal mode analysis">
                    <NormalModes displayData={displayData} dataFiles={dataFiles} animateStateChanged={this.animateStateChanged.bind(this)} />
                </Tab>
                <Tab eventKey="ligands" title="Ligands">
                    <div style={styles.ligands}>{this.state.svg}</div>
                </Tab>
                <Tab eventKey="glycans" title="Glycans">
                    <div style={styles.ligands}>
                        <Table>
                            <thead key="foosvg"><tr><th key="Type">Type</th><th key="Q">Q</th><th key="Phi">Phi</th><th key="Theta">Theta</th><th key="BFac">&lt;B&gt;</th><th key="Conformer">Conformer</th><th key="Anomer">Anomer</th><th key="piccy"></th></tr></thead>
                            <tbody>
                                {rows}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
                <Tab eventKey="miniRSRTab" title="Mini RSR">
                    <MiniRSR ref={this.props.rsrRef} sharedArrayBuffer={this.props.sharedArrayBuffer} crystWorker={this.props.crystWorker} addRequest={this.addRequested.bind(this)} liveUpdatingMaps={liveUpdatingMaps} dataFiles={dataFiles} displayData={displayData} mapDataFiles={mapDataFiles} onPDBChange={this.filePendingChanged.bind(this)} />
                </Tab>
                <Tab eventKey="flipPeptideTab" title="Flip Peptide">
                    <FlipPeptide ref={this.props.flipRef} sharedArrayBuffer={this.props.sharedArrayBuffer} crystWorker={this.props.crystWorker} addRequest={this.addRequested.bind(this)} liveUpdatingMaps={liveUpdatingMaps} dataFiles={dataFiles} displayData={displayData} mapDataFiles={mapDataFiles} onPDBChange={this.filePendingChanged.bind(this)} />
                </Tab>
                <Tab eventKey="utilities" title="Utilities">
                    <Utilities displayData={displayData} dataFiles={dataFiles} onSVGChange={this.svgChanged.bind(this)} mapChanged={this.mapChanged.bind(this)} filePendingChanged={this.filePendingChanged.bind(this)} helicesChanged={this.helicesChanged.bind(this)} />
                </Tab>
            </Tabs>
        );
    }
}

export default ControlInterface;
