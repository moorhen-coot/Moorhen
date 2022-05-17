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

class Main extends Component {

    constructor(props){
        super(props);
        //this.state = {score:0.7};
        //this.state = {displayData:[],message:"",sequences:[{name:"seq1",id:guid(),type:"nucleic",sequence:"CACCCGGTCACGTGGCCTACA"},{name:"seq2",id:guid(),type:"nucleic",sequence:"GTGTAGGCCACGTGACCGGGT"},{name:"seq3",id:guid(),type:"peptide",sequence:"MHMDEKRRAQHNEVERRRRDKINNWIVQLSKIIPDSSMESTKSGQSKGGILSKASDYIQELRQSNHR"},{name:"seq4",id:guid(),type:"peptide",sequence:"KDDLAYSPPFYPSPWADGQGEWAEVYKRAVDIVSQMTLTEKVNLTTGTGWQLERCVGQTGSVPRLNIPSLCLQDSPLGIRFSDYNSAFPAGVNVAATWDKTLAYLRGQAMGEEFSDKGIDVQLGPAAGPLGAHPDGGRNWEGFSPDPALTGVLFAETIKGIQDAGVIATAKHYIMNEQEHFRQQPEAAGYGFNVSDSLSSNVDDKTMHELYLWPFADAVRAGVGAVMCSYNQINNSYGCENSETLNKLLKAELGFQGFVMSDWTAHHSGVGAALAGLDMSMPGDVTFDSGTSFWGANLTVGVLNGTIPQWRVDDMAVRIMAAYYKVGRDTKYTPPNFSSWTRDEYGFAHNHVSEGAYERVNEFVDVQRDHADLIRRIGAQSTVLLKNKGALPLSRKEKLVALLGEDAGSNSWGANGCDDRGCDNGTLAMAWGSGTANFPYLVTPEQAIQNEVLQGRGNVFAVTDSWALDKIAAAARQASVSLVFVNSDSGEGYLSVDGNEGDRNNITLWKNGDNVVKTAANNCNNTVVIIHSVGPVLIDEWYDHPNVTGILWAGLPGQESGNSIADVLYGRVNPGAKSPFTWGKTRESYGSPLVKDANNGNGAPQSDFTQGVFIDYRHFDKFNETPIYEFGYGLSYTTFELSDLHVQPLNASRYTPTSGMTEAAKNFGEIGDASEYVYPEGLERIHEFIYPWINSTDLKASSDDSNYGWEDSKYIPEGATDGSAQPRLPASGGAGGNPGLYEDLFRVSVKVKNTGNVAGDEVPQLYVSLGGPNEPKVVLRKFERIHLAPSQEAVWTTTLTRRDLANWDVSAQDWTVTPYPKTIYVGNSSRKLPLQASLPKAQ"},{name:"seq5",id:guid(),type:"peptide",sequence:"MRLFGYARVSTSQQSLDIQVRALKDAGVKANRIFTDKASGSSSDRKGLDLLRMKVEEGDVILVKKLDRLG"},{name:"seq6",id:guid(),type:"peptide",sequence:"DRHHHHHHKLQLGRFWHISDLHLDPNYTVSKDPLQVCPSAGSQPVLNAGPWGDYLCDSPWALINSSLYAMKEIEPKPDFILWTGDDTPHVPNESLGEAAVLAIVERLTNLIKEVFPDTKVYAALGNHDFHPKNQFPAQSNRIYNQVAELWRPWLSNESYALFKRGAFYSEKLPGPSRAGRVVVLNTNLYYSNNEQTAGMADPGEQFRWLGDVLSNASRDGEMVYVIGHVPPGFFEKTQNKAWFRESFNEEYLKVIQKHHRVIAGQFFGHHHTDSFRMFYDNTGAPINVMFLTPGVTPWKTTLPGVVDGANNPGIRIFEYDRATLNLKDLVTYFLNLRQANVQETPRWEQEYRLTEAYQVPDASVSSMHTALTRIASEPHILQRYYVYNSVSYNHLTCEDSCRIEHVCAIQHVAFNTYATCLHGLGAK"},{name:"seq7",id:guid(),type:"peptide",sequence: "SGFRKMAFPSGKVEGCMVQVTCGTTTLNGLWLDDVVYCPRHVICTSEDMLNPNYEDLLIRKSNHNFLVQAGNVQLRVIGHSMQNCVLKLKVDTANPKTPKYKFVRIQPGQTFSVLACYNGSPSGVYQCAMRPNFTIKGSFLNGSCGSVGFNIDYDCVSFCYMHHMELPTGVHAGTDLEGNFYGPFVDRQTAQAAGTDTTITVNVLAWLYAAVINGDRWFLNRFTTTLNDFNLVAMKYNYEPLTQDHVDILGPLSAQTGIAVLDMCASLKELLQNGMNGRTILGSALLEDEFTPFDVVRQCSGVTFQ"},{name:"seq8",id:guid(),type:"peptide",sequence:"HMSGFRKMAFPSGKVEGCMVQVTCGTTTLNGLWLDDVVYCPRHVICTSEDMLNPNYEDLLIRKSNHNFLVQAGNVQLRVIGHSMQNCVLKLKVDTANPKTPKYKFVRIQPGQTFSVLACYNGSPSGVYQCAMRPNFTIKGSFLNGSCGSVGFNIDYDCVSFCYMHHMELPTGVHAGTDLEGNFYGPFVDRQTAQAAGTDTTITVNVLAWLYAAVINGDRWFLNRFTTTLNDFNLVAMKYNYEPLTQDHVDILGPLSAQTGIAVLDMCASLKELLQNGMNGRTILGSALLEDEFTPFDVVRQCSGVTFQ"},{name:"seq9",id:guid(),type:"peptide",sequence:"MFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYPDKVFRSSVLHSTQDLFLPFFSNVTWFHAIHVSGTNGTKRFDNPVLPFNDGVYFASTEKSNIIRGWIFGTTLDSKTQSLLIVNNATNVVIKVCEFQFCNDPFLGVYYHKNNKSWMESEFRVYSSANNCTFEYVSQPFLMDLEGKQGNFKNLREFVFKNIDGYFKIYSKHTPINLVRDLPQGFSALEPLVDLPIGINITRFQTLLALHRSYLTPGDSSSGWTAGAAAYYVGYLQPRTFLLKYNENGTITDAVDCALDPLSETKCTLKSFTVEKGIYQTSNFRVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNFNFNGLTGTGVLTESNKKFLPFQQFGRDIADTTDAVRDPQTLEILDITPCSFGGVSVITPGTNTSNEVAVLYQDVNCTEVPVAIHADQLTPTWRVYSTGSNVFQTRAGCLIGAEHVNNSYECDIPIGAGICASYQTQTNSPRRARSVASQSIIAYTMSLGAENSVAYSNNSIAIPTNFTISVTTEILPVSMTKTSVDCTMYICGDSTECSNLLLQYGSFCTQLNRALTGIAVEQDKNTQEVFAQVKQIYKTPPIKDFGGFNFSQILPDPSKPSKRSFIEDLLFNKVTLADAGFIKQYGDCLGDIAARDLICAQKFNGLTVLPPLLTDEMIAQYTSALLAGTITSGWTFGAGAALQIPFAMQMAYRFNGIGVTQNVLYENQKLIANQFNSAIGKIQDSLSSTASALGKLQDVVNQNAQALNTLVKQLSSNFGAISSVLNDILSRLDPPEAEVQIDRLITGRLQSLQTYVTQQLIRAAEIRASANLAATKMSECVLGQSKRVDFCGKGYHLMSFPQSAPHGVVFLHVTYVPAQEKNFTTAPAICHDGKAHFPREGVFVSNGTHWFVTQRNFYEPQIITTDNTFVSGNCDVVIGIVNNTVYDPLQPELDSFKEELDKYFKNHTSPDVDLGDISGINASVVNIQKEIDRLNEVAKNLNESLIDLQELGKYEQYIKWPSGRLVPRGSPGSGYIPEAPRDGQAYVRKDGEWVLLSTFLGHHHHHH"},{name:"seq10",id:guid(),type:"peptide",sequence:"RVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNFSGHHHHHH"},{name:"seq11",id:guid(),type:"peptide",sequence:"MISLIAALAVDRVIGMENAMPWNLPADLAWFKRNTLDKPVIMGRHTWESIGRPLPGRKNIILSSQPGTDDRVTWVKSVDEAIAACGDVPEIMVIGGGRVYEQFLPKAQKLYLTHIDAEVEGDTHFPDYEPDDWESVFSEFHDADAQNSHSYCFEILERR"},{name:"seq12",id:guid(),type:"peptide",sequence:"DNDSVVEEHGQLSISNGELVNERGEQVQLKGMSSHGLQWYGQFVNYESMKWLRDDWGINVFRAAMYTSSGGYIDDPSVKEKVKEAVEAAIDLDIYVIIDWHILSDNDPNIYKEEAKDFFDEMSELYGDYPNVIYEIANEPNGSDVTWGNQIKPYAEEVIPIIRNNDPNNIIIVGTGTWSQDVHHAADNQLADPNVMYAFHFYAGTHGQNLRDQVDYALDQGAAIFVSEWGTSAATGDGGVFLDEAQVWIDFMDERNLSWANWSLTHKDESSAALMPGANPTGGWTEAELSPSGTFVREKIRES"},{name:"seq13",id:guid(),type:"peptide",sequence:"QDNDSVVEEHGQLSISNGELVNERGEQVQLKGMSSHGLQWYGQFVNYESMKWLRDDWGINVFRAAMYTSSGGYIDDPSVKEKVKEAVEAAIDLDIYVIIDWHILSDNDPNIYKEEAKDFFDEMSELYGDYPNVIYEIANEPNGSDVTWGNQIKPYAEEVIPIIRNNDPNNIIIVGTGTWSQDVHHAADNQLADPNVMYAFHFYAGTHGQNLRDQVDYALDQGAAIFVSEWGTSAATGDGGVFLDEAQVWIDFMDERNLSWANWSLTHKDESSAALMPGANPTGGWTEAELSPSGTFVREKIRES"},{name:"seq14",id:guid(),type:"peptide",sequence:"ATSTKKLHKEPATLIKAIDGDTLKLMYKGQPMTFRLLLVDTPEFNEKYGPEASAFTKKMVENAKKIEVEFDKGQRTDKYGRGLAYIYADGKMINEALVRQGLAKVAYVYKGNNTHEQLLRKAEAQAKKEKLNIWSEDNADSGQ"},{name:"seq15",id:guid(),type:"peptide",sequence:"MISLIAALAVDRVIGMENAMPWNLPADLAWFKRNTLDKPVIMGRHTWESIGRPLPGRKNIILSSQPGTDDRVTWVKSVDEAIAACGDVPEIMVIGGGRVYEQFLPKAQKLYLTHIDAEVEGDTHFPDYEPDDWESVFSEFHDADAQNSHSYCFKILERR"}]};
        //this.state = {displayData:[],message:"",sequences:[{sequence:"CACCCGGTCACGTGGCCTACA",name:"seq1",id:guid(),type:"nucleic"}]};
        this.state = {displayData:[],message:"",sequences:[], svg:"", dataFiles:{ids:{}}};
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

    svgChanged(params) {
        //FIXME - Do something
        console.log(params);
        let message = "";
        let data = params.svg;
        for(let ilig=0;ilig<Object.keys(data).length;ilig++){
            let svg = data[Object.keys(data)[ilig]];
            message += svg + Object.keys(data)[ilig];
        }
        this.setState({svg:parse(message)});
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

    matricesChanged(data) {
        console.log("matricesChanged");
        console.log(data);

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
        }
        this.gl.current.drawScene();

    }

    render(){

        //const score = this.state.score;
        const enerLib = this.enerLib;
        const displayData = this.state.displayData;
        const dataFiles = this.state.dataFiles;
        return  (
<Container>
<Row>
            <Col>
            {/*<ScoreWidget score={score} />*/}
            <MGWebGL enerLib={enerLib} ref={this.gl} dataChanged={this.displayDataChanged.bind(this)} messageChanged={this.statusMessageChanged.bind(this)}  />
            </Col>

            <Col lg={6}>
            <ControlInterface displayData={displayData} enerLib={enerLib} svgChange={this.svgChanged.bind(this)} filePendingChange={this.filePendingChanged.bind(this)} lightsChange={this.lightsChanged.bind(this)} addRequest={this.addRequested.bind(this)} deleteRequest={this.deleteRequested.bind(this)} visibilityChange={this.visibilityChanged.bind(this)} matricesChanged={this.matricesChanged.bind(this)} dataFiles={dataFiles}/>
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
