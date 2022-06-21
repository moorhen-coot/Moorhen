import React, { Component } from 'react';

import parse from 'html-react-parser';

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';

//import ScoreWidget from './ScoreWidget';

import { guid } from './guid.js';

import ControlInterface from './ControlInterface';

import {EnerLib} from './mgMiniMol.js';

import {MGWebGL } from './mgWebGL.js';

import {wizards} from './mgWizard.js';

import {SequenceViewer} from './SequenceViewer.js';

import {ColourScheme, contactsToLinesInfo} from './mgWebGLAtomsToPrimitives.js';

class Main extends Component {

    constructor(props){
        super(props);
        //this.state = {score:0.7};
        //this.state = {displayData:[],message:"",sequences:[{name:"seq1",id:guid(),type:"nucleic",sequence:"CACCCGGTCACGTGGCCTACA"},{name:"seq2",id:guid(),type:"nucleic",sequence:"GTGTAGGCCACGTGACCGGGT"},{name:"seq3",id:guid(),type:"peptide",sequence:"MHMDEKRRAQHNEVERRRRDKINNWIVQLSKIIPDSSMESTKSGQSKGGILSKASDYIQELRQSNHR"},{name:"seq4",id:guid(),type:"peptide",sequence:"KDDLAYSPPFYPSPWADGQGEWAEVYKRAVDIVSQMTLTEKVNLTTGTGWQLERCVGQTGSVPRLNIPSLCLQDSPLGIRFSDYNSAFPAGVNVAATWDKTLAYLRGQAMGEEFSDKGIDVQLGPAAGPLGAHPDGGRNWEGFSPDPALTGVLFAETIKGIQDAGVIATAKHYIMNEQEHFRQQPEAAGYGFNVSDSLSSNVDDKTMHELYLWPFADAVRAGVGAVMCSYNQINNSYGCENSETLNKLLKAELGFQGFVMSDWTAHHSGVGAALAGLDMSMPGDVTFDSGTSFWGANLTVGVLNGTIPQWRVDDMAVRIMAAYYKVGRDTKYTPPNFSSWTRDEYGFAHNHVSEGAYERVNEFVDVQRDHADLIRRIGAQSTVLLKNKGALPLSRKEKLVALLGEDAGSNSWGANGCDDRGCDNGTLAMAWGSGTANFPYLVTPEQAIQNEVLQGRGNVFAVTDSWALDKIAAAARQASVSLVFVNSDSGEGYLSVDGNEGDRNNITLWKNGDNVVKTAANNCNNTVVIIHSVGPVLIDEWYDHPNVTGILWAGLPGQESGNSIADVLYGRVNPGAKSPFTWGKTRESYGSPLVKDANNGNGAPQSDFTQGVFIDYRHFDKFNETPIYEFGYGLSYTTFELSDLHVQPLNASRYTPTSGMTEAAKNFGEIGDASEYVYPEGLERIHEFIYPWINSTDLKASSDDSNYGWEDSKYIPEGATDGSAQPRLPASGGAGGNPGLYEDLFRVSVKVKNTGNVAGDEVPQLYVSLGGPNEPKVVLRKFERIHLAPSQEAVWTTTLTRRDLANWDVSAQDWTVTPYPKTIYVGNSSRKLPLQASLPKAQ"},{name:"seq5",id:guid(),type:"peptide",sequence:"MRLFGYARVSTSQQSLDIQVRALKDAGVKANRIFTDKASGSSSDRKGLDLLRMKVEEGDVILVKKLDRLG"},{name:"seq6",id:guid(),type:"peptide",sequence:"DRHHHHHHKLQLGRFWHISDLHLDPNYTVSKDPLQVCPSAGSQPVLNAGPWGDYLCDSPWALINSSLYAMKEIEPKPDFILWTGDDTPHVPNESLGEAAVLAIVERLTNLIKEVFPDTKVYAALGNHDFHPKNQFPAQSNRIYNQVAELWRPWLSNESYALFKRGAFYSEKLPGPSRAGRVVVLNTNLYYSNNEQTAGMADPGEQFRWLGDVLSNASRDGEMVYVIGHVPPGFFEKTQNKAWFRESFNEEYLKVIQKHHRVIAGQFFGHHHTDSFRMFYDNTGAPINVMFLTPGVTPWKTTLPGVVDGANNPGIRIFEYDRATLNLKDLVTYFLNLRQANVQETPRWEQEYRLTEAYQVPDASVSSMHTALTRIASEPHILQRYYVYNSVSYNHLTCEDSCRIEHVCAIQHVAFNTYATCLHGLGAK"},{name:"seq7",id:guid(),type:"peptide",sequence: "SGFRKMAFPSGKVEGCMVQVTCGTTTLNGLWLDDVVYCPRHVICTSEDMLNPNYEDLLIRKSNHNFLVQAGNVQLRVIGHSMQNCVLKLKVDTANPKTPKYKFVRIQPGQTFSVLACYNGSPSGVYQCAMRPNFTIKGSFLNGSCGSVGFNIDYDCVSFCYMHHMELPTGVHAGTDLEGNFYGPFVDRQTAQAAGTDTTITVNVLAWLYAAVINGDRWFLNRFTTTLNDFNLVAMKYNYEPLTQDHVDILGPLSAQTGIAVLDMCASLKELLQNGMNGRTILGSALLEDEFTPFDVVRQCSGVTFQ"},{name:"seq8",id:guid(),type:"peptide",sequence:"HMSGFRKMAFPSGKVEGCMVQVTCGTTTLNGLWLDDVVYCPRHVICTSEDMLNPNYEDLLIRKSNHNFLVQAGNVQLRVIGHSMQNCVLKLKVDTANPKTPKYKFVRIQPGQTFSVLACYNGSPSGVYQCAMRPNFTIKGSFLNGSCGSVGFNIDYDCVSFCYMHHMELPTGVHAGTDLEGNFYGPFVDRQTAQAAGTDTTITVNVLAWLYAAVINGDRWFLNRFTTTLNDFNLVAMKYNYEPLTQDHVDILGPLSAQTGIAVLDMCASLKELLQNGMNGRTILGSALLEDEFTPFDVVRQCSGVTFQ"},{name:"seq9",id:guid(),type:"peptide",sequence:"MFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYPDKVFRSSVLHSTQDLFLPFFSNVTWFHAIHVSGTNGTKRFDNPVLPFNDGVYFASTEKSNIIRGWIFGTTLDSKTQSLLIVNNATNVVIKVCEFQFCNDPFLGVYYHKNNKSWMESEFRVYSSANNCTFEYVSQPFLMDLEGKQGNFKNLREFVFKNIDGYFKIYSKHTPINLVRDLPQGFSALEPLVDLPIGINITRFQTLLALHRSYLTPGDSSSGWTAGAAAYYVGYLQPRTFLLKYNENGTITDAVDCALDPLSETKCTLKSFTVEKGIYQTSNFRVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNFNFNGLTGTGVLTESNKKFLPFQQFGRDIADTTDAVRDPQTLEILDITPCSFGGVSVITPGTNTSNEVAVLYQDVNCTEVPVAIHADQLTPTWRVYSTGSNVFQTRAGCLIGAEHVNNSYECDIPIGAGICASYQTQTNSPRRARSVASQSIIAYTMSLGAENSVAYSNNSIAIPTNFTISVTTEILPVSMTKTSVDCTMYICGDSTECSNLLLQYGSFCTQLNRALTGIAVEQDKNTQEVFAQVKQIYKTPPIKDFGGFNFSQILPDPSKPSKRSFIEDLLFNKVTLADAGFIKQYGDCLGDIAARDLICAQKFNGLTVLPPLLTDEMIAQYTSALLAGTITSGWTFGAGAALQIPFAMQMAYRFNGIGVTQNVLYENQKLIANQFNSAIGKIQDSLSSTASALGKLQDVVNQNAQALNTLVKQLSSNFGAISSVLNDILSRLDPPEAEVQIDRLITGRLQSLQTYVTQQLIRAAEIRASANLAATKMSECVLGQSKRVDFCGKGYHLMSFPQSAPHGVVFLHVTYVPAQEKNFTTAPAICHDGKAHFPREGVFVSNGTHWFVTQRNFYEPQIITTDNTFVSGNCDVVIGIVNNTVYDPLQPELDSFKEELDKYFKNHTSPDVDLGDISGINASVVNIQKEIDRLNEVAKNLNESLIDLQELGKYEQYIKWPSGRLVPRGSPGSGYIPEAPRDGQAYVRKDGEWVLLSTFLGHHHHHH"},{name:"seq10",id:guid(),type:"peptide",sequence:"RVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNFSGHHHHHH"},{name:"seq11",id:guid(),type:"peptide",sequence:"MISLIAALAVDRVIGMENAMPWNLPADLAWFKRNTLDKPVIMGRHTWESIGRPLPGRKNIILSSQPGTDDRVTWVKSVDEAIAACGDVPEIMVIGGGRVYEQFLPKAQKLYLTHIDAEVEGDTHFPDYEPDDWESVFSEFHDADAQNSHSYCFEILERR"},{name:"seq12",id:guid(),type:"peptide",sequence:"DNDSVVEEHGQLSISNGELVNERGEQVQLKGMSSHGLQWYGQFVNYESMKWLRDDWGINVFRAAMYTSSGGYIDDPSVKEKVKEAVEAAIDLDIYVIIDWHILSDNDPNIYKEEAKDFFDEMSELYGDYPNVIYEIANEPNGSDVTWGNQIKPYAEEVIPIIRNNDPNNIIIVGTGTWSQDVHHAADNQLADPNVMYAFHFYAGTHGQNLRDQVDYALDQGAAIFVSEWGTSAATGDGGVFLDEAQVWIDFMDERNLSWANWSLTHKDESSAALMPGANPTGGWTEAELSPSGTFVREKIRES"},{name:"seq13",id:guid(),type:"peptide",sequence:"QDNDSVVEEHGQLSISNGELVNERGEQVQLKGMSSHGLQWYGQFVNYESMKWLRDDWGINVFRAAMYTSSGGYIDDPSVKEKVKEAVEAAIDLDIYVIIDWHILSDNDPNIYKEEAKDFFDEMSELYGDYPNVIYEIANEPNGSDVTWGNQIKPYAEEVIPIIRNNDPNNIIIVGTGTWSQDVHHAADNQLADPNVMYAFHFYAGTHGQNLRDQVDYALDQGAAIFVSEWGTSAATGDGGVFLDEAQVWIDFMDERNLSWANWSLTHKDESSAALMPGANPTGGWTEAELSPSGTFVREKIRES"},{name:"seq14",id:guid(),type:"peptide",sequence:"ATSTKKLHKEPATLIKAIDGDTLKLMYKGQPMTFRLLLVDTPEFNEKYGPEASAFTKKMVENAKKIEVEFDKGQRTDKYGRGLAYIYADGKMINEALVRQGLAKVAYVYKGNNTHEQLLRKAEAQAKKEKLNIWSEDNADSGQ"},{name:"seq15",id:guid(),type:"peptide",sequence:"MISLIAALAVDRVIGMENAMPWNLPADLAWFKRNTLDKPVIMGRHTWESIGRPLPGRKNIILSSQPGTDDRVTWVKSVDEAIAACGDVPEIMVIGGGRVYEQFLPKAQKLYLTHIDAEVEGDTHFPDYEPDDWESVFSEFHDADAQNSHSYCFKILERR"}]};
        //this.state = {displayData:[],message:"",sequences:[{sequence:"CACCCGGTCACGTGGCCTACA",name:"seq1",id:guid(),type:"nucleic"}]};
        this.state = {displayData:[],message:"",sequences:[], svg:"", mapDataFiles:{ids:{}}, dataFiles:{ids:{}}};
        this.enerLib = new EnerLib();
        this.gl = React.createRef();
        this.seqRef = React.createRef();
    }

    sequenceSelectionChanged(data){
        console.log(data);
    }

    statusMessageChanged(data){
        this.setState({message:data.message});
    }

    displayDataChanged(data){
        this.setState({displayData:data.data});
    }

    glycanChanged(params) {
        console.log("Some glycans...");
        console.log(params);
    }

    svgChanged(params) {
        let message = "";
        let data = params.svg;
        for(let ilig=0;ilig<Object.keys(data).length;ilig++){
            let svg = data[Object.keys(data)[ilig]];
            message += svg + Object.keys(data)[ilig];
        }
        this.setState({svg:parse(message)});
    }

    mapChanged(data){
        const theBuffers = this.gl.current.appendOtherData(data.mapTriangleData);
        this.gl.current.reContourMaps();
        console.log(theBuffers);
        let fileDataId = guid();
        const changedIds = { ...this.state.mapDataFiles.ids, [fileDataId] :  {buffers:theBuffers, data: data.mapTriangleData, name:data.name }};
        const newIds = { ...this.state.mapDataFiles, ids : changedIds };
        this.setState({mapDataFiles:newIds});
    }

    filePendingChanged(params){
        //FIXME - load new file should not delete existing files; change of wizard should delete buffers associated with that file.
        //this.gl.current.clearData();
        let fileDataId = guid();
        this.gl.current.loadDataWithWizard(params.pending.atoms,this.enerLib,true,wizards[params.pending.wizard],params.pending.name,fileDataId);
        if(params.pending&&params.pending.atoms&&params.pending.atoms.sequences){
            let theSequences = params.pending.atoms.sequences;
            this.seqRef.current.addSequences(theSequences);
        }
        const changedIds = { ...this.state.dataFiles.ids, [fileDataId] :  params.pending.fileData};
        const newIds = { ...this.state.dataFiles, ids : changedIds };
        this.setState({dataFiles:newIds});
    }

    animateStateChanged(data) {
        console.log("Request animate state change");

        if(data.animate===false){
            this.gl.current.clearAnimation();
            return;
        }

        for(let idat=0;idat<this.gl.current.dataInfo.length;idat++){
            if(data.dataId===this.gl.current.dataInfo[idat].id){
                const theData = this.gl.current.dataInfo[idat];
                const pdbatoms = theData["atoms"];
                const colourScheme = new ColourScheme(pdbatoms);
                const hier = pdbatoms["atoms"];
                const model = hier[0];
                const traceAtoms = model.getAtoms("catrace");
                let atomColours = colourScheme.colourByAtomType();
                let originalCoordsX = [];
                let originalCoordsY = [];
                let originalCoordsZ = [];
                for(let iat=0;iat<traceAtoms.length;iat++){
                    originalCoordsX.push(traceAtoms[iat]["_atom_site.Cartn_x"]);
                    originalCoordsY.push(traceAtoms[iat]["_atom_site.Cartn_y"]);
                    originalCoordsZ.push(traceAtoms[iat]["_atom_site.Cartn_z"]);
                }
                console.log("The real deltas:");
                console.log(data.displacements);
                let animation = [];
                //FIXME - Not sure how I should determine scale (amplitude in NMA case).
                const scale = 5.0;
                for(let istep=0;istep<data.displacements.steps.length;istep++){
                    for(let iat=0;iat<traceAtoms.length;iat++){
                        traceAtoms[iat]["_atom_site.Cartn_x"] = originalCoordsX[iat] + scale * data.displacements.steps[istep].xyz[3*iat];
                        traceAtoms[iat]["_atom_site.Cartn_y"] = originalCoordsY[iat] + scale * data.displacements.steps[istep].xyz[3*iat+1];
                        traceAtoms[iat]["_atom_site.Cartn_z"] = originalCoordsZ[iat] + scale * data.displacements.steps[istep].xyz[3*iat+2];
                    }
                    let contacts = model.SeekContacts(traceAtoms,traceAtoms,3.1,4.1);
                    animation.push(contactsToLinesInfo(contacts,2,atomColours));
                }
                for(let iat=0;iat<traceAtoms.length;iat++){
                    traceAtoms[iat]["_atom_site.Cartn_x"] = originalCoordsX[iat];
                    traceAtoms[iat]["_atom_site.Cartn_y"] = originalCoordsY[iat];
                    traceAtoms[iat]["_atom_site.Cartn_z"] = originalCoordsZ[iat];
                }
                this.gl.current.setupAnimation(theData,animation);
                break;
            }
        }
    }

    matricesChanged(data) {
        if(data.matrices.length==0){
            this.gl.current.clearDataTransforms();
        }
        for(let imat=0;imat<data.matrices.length;imat++){
            const data_id = data.dataIds[imat];
            const matrix = data.matrices[imat];
            this.gl.current.setDataTransform(data_id,matrix);
        }

    }
    addRequested(data) {
        this.gl.current.addNewObjectToDataInfo(data);

    }

    deleteRequested(data_id){
        this.gl.current.deleteDataId(data_id);
    }

    visibilityChanged(params){
        this.gl.current.setObjectsVisibility(params.bufferIds,params.visible);
    }

    lightsChanged(params){
        //this.setState({score:parseInt(params.lights.specular)/100.});
        if("lights" in params){
            if("ambient" in params.lights){
                let r = 1.0;
                let g = 1.0;
                let b = 1.0;
                if("ambientColor" in params.lights){
                    r = params.lights.ambientColor.r / 255.;
                    g = params.lights.ambientColor.g / 255.;
                    b = params.lights.ambientColor.b / 255.;
                }
                r *= params.lights.ambient / 100.;
                g *= params.lights.ambient / 100.;
                b *= params.lights.ambient / 100.;
                this.gl.current.setAmbientLightNoUpdate(r,g,b);
            }
            if("specular" in params.lights){
                let r = 1.0;
                let g = 1.0;
                let b = 1.0;
                if("specularColor" in params.lights){
                    r = params.lights.specularColor.r / 255.;
                    g = params.lights.specularColor.g / 255.;
                    b = params.lights.specularColor.b / 255.;
                }
                r *= params.lights.specular / 100.;
                g *= params.lights.specular / 100.;
                b *= params.lights.specular / 100.;
                this.gl.current.setSpecularLightNoUpdate(r,g,b);
            }
            if("diffuse" in params.lights){
                let r = 1.0;
                let g = 1.0;
                let b = 1.0;
                if("diffuseColor" in params.lights){
                    r = params.lights.diffuseColor.r / 255.;
                    g = params.lights.diffuseColor.g / 255.;
                    b = params.lights.diffuseColor.b / 255.;
                }
                r *= params.lights.diffuse / 100.;
                g *= params.lights.diffuse / 100.;
                b *= params.lights.diffuse / 100.;
                this.gl.current.setDiffuseLightNoUpdate(r,g,b);
            }
            if("position" in params.lights){
                let x = params.lights.position.x;
                let y = params.lights.position.y;
                let z = params.lights.position.z;
                this.gl.current.setLightPositionNoUpdate(x,y,z);
            }
            if("slab" in params.lights){
                this.gl.current.setSlab([parseInt(params.lights.slab.width),parseInt(params.lights.slab.position)]);
            }
            if("fog" in params.lights){
                this.gl.current.setFog([parseInt(params.lights.fog.near),parseInt(params.lights.fog.far)]);
            }
            if("bgcolor" in params.lights){
                this.gl.current.setBackground([parseFloat(params.lights.bgcolor.r)/255.,parseFloat(params.lights.bgcolor.g)/255.,parseFloat(params.lights.bgcolor.b)/255.,1.0]);
            }
        }
        this.gl.current.drawScene();

    }

    onSVGClick(m) {
        if("hrefText" in m.clickMessage && "key" in m.clickMessage){
            const t = m.clickMessage["hrefText"];
            const k = m.clickMessage["key"];
            if(t.startsWith("mmdb://")){
                const kBaseName = k.replace(/\.[^/.]+$/, "");
                for(let idat=0;idat<this.state.displayData.length;idat++){
                    if(kBaseName===this.state.displayData[idat].name){
                        try {
                            const theAtoms = this.state.displayData[idat].atoms.atoms[0].getAtoms(t.substring("mmdb://".length));
                            if(theAtoms.length>0){
                                let cox = 0.0;
                                let coz = 0.0;
                                let coy = 0.0;
                                for(let iat=0;iat<theAtoms.length;iat++){
                                    cox += theAtoms[iat].x();
                                    coy += theAtoms[iat].y();
                                    coz += theAtoms[iat].z();
                                }
                                cox /= theAtoms.length;
                                coy /= theAtoms.length;
                                coz /= theAtoms.length;
//Not sure why I need to negate. Hmm.
                                this.gl.current.setOrigin([-cox,-coy,-coz]);
                            }
                        } catch(e) {
                            console.log("Failed to get selection in SVG click");
                            console.log(e);
                        }
                    }
                }
            }
        }
    }
    

    render(){
        console.log(this.state);

        //const score = this.state.score;
        const enerLib = this.enerLib;
        const displayData = this.state.displayData;
        const dataFiles = this.state.dataFiles;
        const mapDataFiles = this.state.mapDataFiles;
        return  (
<Container>
<Row>
            <Col>
            {/*<ScoreWidget score={score} />*/}
            <MGWebGL enerLib={enerLib} ref={this.gl} dataChanged={this.displayDataChanged.bind(this)} messageChanged={this.statusMessageChanged.bind(this)}  />
            </Col>

            <Col lg={6}>
            <ControlInterface displayData={displayData} enerLib={enerLib} glycanChange={this.glycanChanged.bind(this)} svgChange={this.svgChanged.bind(this)} mapChanged={this.mapChanged.bind(this)} filePendingChange={this.filePendingChanged.bind(this)} lightsChange={this.lightsChanged.bind(this)} addRequest={this.addRequested.bind(this)} deleteRequest={this.deleteRequested.bind(this)} visibilityChange={this.visibilityChanged.bind(this)} matricesChanged={this.matricesChanged.bind(this)} animateStateChanged={this.animateStateChanged.bind(this)} mapDataFiles={mapDataFiles} dataFiles={dataFiles} svgClicked={this.onSVGClick.bind(this)} />
            </Col>

            </Row>
            <Row>
            <Col>
            <SequenceViewer sequences={this.state.sequences} ref={this.seqRef} selectionChanged={this.sequenceSelectionChanged.bind(this)} messageChanged={this.statusMessageChanged.bind(this)} />
            </Col>
            </Row>
            <Row>
            <div>{this.state.message}</div>
            </Row>
            <Row>
            <div>{this.state.svg}</div>
            </Row>
</Container>
);
    }
}

export default Main;
