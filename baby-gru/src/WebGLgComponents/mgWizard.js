import * as vec3 from 'gl-matrix/vec3';
import * as vec4 from 'gl-matrix/vec4';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
//import {vec3} from 'gl-matrix/esm';
import {Model} from './mgMiniMol.js';
import {ColourScheme, contactsToLinesInfo, singletonsToLinesInfo, atomsToSpheresInfo, contactsToCylindersInfo, getMultipleBonds, contactsToCappedCylindersInfo, getBaseBlocks, getGlycoBlocks} from './mgWebGLAtomsToPrimitives.js';
import {CalcSecStructure,GetSplinesColoured,GetWormColoured} from './mgSecStr.js';

function vec3Create(v){
    var theVec = vec3.create();
    vec3.set(theVec,v[0],v[1],v[2],v[3]);
    return theVec;
}

function NormalizeVec3(v){
    let vin = vec3Create(v);
    vec3.normalize(v,vin);
}

function wizardBonds(pdbatoms,enerLib,bruteForceHB){
    let hier = pdbatoms["atoms"];

    let colourScheme = new ColourScheme(pdbatoms);
    let atomColours = colourScheme.colourByAtomType();

    let objects = [];

    for(let imod=0;imod<1;imod++){
        let model = hier[imod];
        /*
        let atoms = model.getAllAtoms();
        contacts = model.SeekContacts(atoms,atoms,0.6,1.6);
        */
        let contactsAndSingletons = model.getBondsContactsAndSingletons();
        let contacts = contactsAndSingletons["contacts"];
        let singletons = contactsAndSingletons["singletons"];
        let linePrimitiveInfo = contactsToLinesInfo(contacts,4,atomColours);
        let singletonPrimitiveInfo = singletonsToLinesInfo(singletons,4,atomColours);
        linePrimitiveInfo["display_class"] = "bonds";
        singletonPrimitiveInfo["display_class"] = "bonds";
        objects.push(linePrimitiveInfo);
        objects.push(singletonPrimitiveInfo);
    }

    return objects;
}

function wizardCATrace(pdbatoms,enerLib,bruteForceHB){
    const hier = pdbatoms["atoms"];
    const model = hier[0];
    const traceAtoms = model.getAtoms("catrace");
    let colourScheme = new ColourScheme(pdbatoms);
    let objects = [];
    let contacts = model.SeekContacts(traceAtoms,traceAtoms,3.4,4.1);
    let atomColours = colourScheme.colourByAtomType();
    let linePrimitiveInfo = contactsToLinesInfo(contacts,2,atomColours);
    linePrimitiveInfo["display_class"] = "bonds";
    objects.push(linePrimitiveInfo);
    return objects;
}

function wizardRibbons(pdbatoms,enerLib,bruteForceHB){

    let start = new Date().getTime();
    let objects = [];

    let hier = pdbatoms["atoms"];
    let flagBulge = true;
    CalcSecStructure(hier,flagBulge);

    console.log("Time to CalcSecStructure: "+(new Date().getTime()-start));

    let colourScheme = new ColourScheme(pdbatoms);
    let atomColours = colourScheme.colourBySecondaryStructure({"strand":[0.0,0.0,1.0,1.0],"helix":[1.0,0.0,0.0,1.0]});
    let coloured_splines_info = GetSplinesColoured(pdbatoms,atomColours);

    console.log("Time to GetSplinesColoured: "+(new Date().getTime()-start));

    for(let itri=0;itri<coloured_splines_info.length;itri++){
        coloured_splines_info[itri]["display_class"] = "ribbons";
        objects.push(coloured_splines_info[itri]);
    }

    console.log("Time to do everything: "+(new Date().getTime()-start));

    return objects;
  
}

function wizardRibbonsByChain(pdbatoms,enerLib,bruteForceHB){

    let start = new Date().getTime();
    let objects = [];

    let hier = pdbatoms["atoms"];
    let flagBulge = true;
    CalcSecStructure(hier,flagBulge);

    console.log("Time to CalcSecStructure: "+(new Date().getTime()-start));

    let colourScheme = new ColourScheme(pdbatoms);
    let atomColours = colourScheme.colourByChain();
    let coloured_splines_info = GetSplinesColoured(pdbatoms,atomColours);

    console.log("Time to GetSplinesColoured: "+(new Date().getTime()-start));

    for(let itri=0;itri<coloured_splines_info.length;itri++){
        coloured_splines_info[itri]["display_class"] = "ribbons";
        objects.push(coloured_splines_info[itri]);
    }

    console.log("Time to do everything: "+(new Date().getTime()-start));

    return objects;
  
}

function wizardWorms(pdbatoms,enerLib,bruteForceHB){

    let start = new Date().getTime();
    let objects = [];

    let hier = pdbatoms["atoms"];

    let colourScheme = new ColourScheme(pdbatoms);
    let atomColours = colourScheme.colourByChain();
    let coloured_splines_info = GetWormColoured(pdbatoms,atomColours);

    console.log("Time to GetSplinesColoured: "+(new Date().getTime()-start));

    for(let itri=0;itri<coloured_splines_info.length;itri++){
        coloured_splines_info[itri]["display_class"] = "ribbons";
        objects.push(coloured_splines_info[itri]);
    }

    console.log("Time to do everything: "+(new Date().getTime()-start));

    return objects;
  
}

function wizardSiteAndRibbonsByChain(pdbatoms,enerLib,bruteForceHB){

    // TODO 
    //  - Glycoblocks (NEED glycoblocks and glycosylation selection!)
    //  - ligand, neighb, and all-atom surfaces (invis). (NEED surface!)

    let start = new Date().getTime();
    let objects = [];

    if(typeof(pdbatoms["modamino"])!=="undefined"){
        for(let imod=0;imod<pdbatoms["modamino"].length;imod++){
            Model.prototype.getPeptideLibraryEntry(pdbatoms["modamino"][imod],enerLib);
        }
    }

    enerLib.AssignHBTypes(pdbatoms,bruteForceHB);
    console.log("Time to AssignHBTypes: "+(new Date().getTime()-start));
    let hier = pdbatoms["atoms"];
    let model = hier[0];
    console.log("Time to 'get model': "+(new Date().getTime()-start));
    model.calculateHBonds();
    //return objects;
    console.log("Time to calculateHBonds: "+(new Date().getTime()-start));

    let flagBulge = true;
    CalcSecStructure(hier,flagBulge);
    console.log("Time to CalcSecStructure: "+(new Date().getTime()-start));

    let colourScheme = new ColourScheme(pdbatoms);
    let atomColours = colourScheme.colourByChain({"nonCByAtomType":true});
    let atomColoursByChainWithC = colourScheme.colourByChain({"nonCByAtomType":false});
    let coloured_splines_info = GetSplinesColoured(pdbatoms,atomColours);
    console.log("Time to GetSplinesColoured: "+(new Date().getTime()-start));
    for(let itri=0;itri<coloured_splines_info.length;itri++){
        if(typeof(coloured_splines_info[itri].sizes)!=="undefined"&&coloured_splines_info[itri].sizes.length>0&&coloured_splines_info[itri].sizes[0].length>0&&coloured_splines_info[itri].sizes[0][0].length>0){
            coloured_splines_info[itri]["display_class"] = "ribbons";
            objects.push(coloured_splines_info[itri]);
        }
    }

    let atomColours2 = colourScheme.colourByAtomType();

    // The hidden all atom model, water and solute.
    for(let imod=0;imod<1;imod++){
        let model = hier[imod];
        let atoms = model.getAllAtoms();
        let contacts = model.SeekContacts(atoms,atoms,0.6,1.6);
        let linePrimitiveInfo = contactsToLinesInfo(contacts,1,atomColours2);
        linePrimitiveInfo.visibility = [false];
        linePrimitiveInfo["display_class"] = "bonds";
        objects.push(linePrimitiveInfo);
    }
    console.log("Time to all atom objects: "+(new Date().getTime()-start));
    let allWater = model.getAtoms("water");
    if(allWater.length>0){
        let allWaterSpheres = atomsToSpheresInfo(allWater,0.2,atomColours2);
        allWaterSpheres.visibility = [false];
        allWaterSpheres["display_class"] = "water";
        objects.push(allWaterSpheres);
        console.log("Time to water objects: "+(new Date().getTime()-start));
    }

    let solute = model.getAtoms("solute");
    if(solute.length>0){
        let soluteSpheres = atomsToSpheresInfo(solute,0.2,atomColours2);
        soluteSpheres.visibility = [false];
        soluteSpheres["display_class"] = "solute";
        objects.push(soluteSpheres);
        let soluteContacts = model.SeekContacts(solute,solute,0.6,1.6);
        let solutePrimitiveInfo = contactsToCylindersInfo(soluteContacts,0.2,atomColours2,false);
        solutePrimitiveInfo.visibility = [false];
        solutePrimitiveInfo["display_class"] = "solute";
        objects.push(solutePrimitiveInfo);
        console.log("Time to solute objects: "+(new Date().getTime()-start));
    }

    let ligandAtoms = model.getAtoms("ligands");
    console.log("##################################################");
    console.log("ligandAtoms");
    console.log(ligandAtoms);
    console.log("##################################################");
    if(ligandAtoms.length>0){
        console.log("Time to get ligands atoms: "+(new Date().getTime()-start));
        let multipleBonds = getMultipleBonds(ligandAtoms,enerLib,0.15,atomColours2);
        console.log("Time to get ligands multiple bonds: "+(new Date().getTime()-start));
        for(let imbo=0;imbo<multipleBonds.length;imbo++){
            multipleBonds[imbo]["display_class"] = "ligands";
            objects.push(multipleBonds[imbo]);
        }
        console.log("Time to get ligands bonds objects: "+(new Date().getTime()-start));
        let spheres = atomsToSpheresInfo(ligandAtoms,0.4,atomColours2);
        console.log("Time to get ligands spheres: "+(new Date().getTime()-start));
        spheres["display_class"] = "ligands";
        objects.push(spheres);
        console.log("Time to get ligands objects: "+(new Date().getTime()-start));
    }

    let blackColours = colourScheme.colourOneColour([0.0,0.0,0.0,1.0]);

    let allAtoms = model.getAtoms("all");
    let hbonds = model.getHBonds(allAtoms,ligandAtoms);
    if(hbonds.length>0){
        console.log("HBonds: "+hbonds.length);
        let hBondPrimitiveInfo = contactsToCappedCylindersInfo(hbonds,0.05,blackColours,true);
        hBondPrimitiveInfo["display_class"] = "neighbourhood";
        objects.push(hBondPrimitiveInfo);
        console.log("Time to get hbond objects: "+(new Date().getTime()-start));
    }

    let sideChains = model.getAtoms("neighb cid=\"ligands\" maxd=4.0 mind=0.0 group=side excl=water,ligands");
    console.log("Time to get side chain atoms: "+(new Date().getTime()-start));
    let mainChains = model.getAtoms("neighb cid=\"ligands\" maxd=4.0 mind=0.0 group=main excl=water,ligands");
    console.log("Time to get main chain atoms: "+(new Date().getTime()-start));

    let mainChainsHBonded = model.getAtoms("neighb cid=\"ligands\" maxd=4.0 group=main hbonded=1 excl=central,water");
    if(mainChainsHBonded.length>0){
        let mainSpheres = atomsToSpheresInfo(mainChainsHBonded,0.2,atomColours);
        mainSpheres["display_class"] = "neighbourhood";
        objects.push(mainSpheres);
        let mainHB_contacts = model.SeekContacts(mainChainsHBonded,mainChainsHBonded,0.6,1.6);
        let mainHBPrimitiveInfo = contactsToCylindersInfo(mainHB_contacts,0.2,atomColours);
        mainHBPrimitiveInfo["display_class"] = "neighbourhood";
        objects.push(mainHBPrimitiveInfo);
    }

    let contacts = model.SeekContacts(sideChains,sideChains,0.6,1.6);
    if(contacts.length>0){
        let sideCylinderPrimitiveInfo = contactsToCylindersInfo(contacts,0.2,atomColours);
        sideCylinderPrimitiveInfo["display_class"] = "neighbourhood";
        objects.push(sideCylinderPrimitiveInfo);
        let sideSpheres = atomsToSpheresInfo(sideChains,0.2,atomColours);
        sideSpheres["display_class"] = "neighbourhood";
        objects.push(sideSpheres);
        console.log("Time to get neighbourhood objects: "+(new Date().getTime()-start));
    }

    let water = model.getAtoms("water and neighb cid=\"ligands\" maxd=4.0 mind=0.0 group=side excl=ligands");
    if(water.length>0){
        console.log("Time to get water atoms: "+(new Date().getTime()-start));
        let waterSpheres = atomsToSpheresInfo(water,0.2,atomColours2);
        waterSpheres["display_class"] = "neighbourhood";
        objects.push(waterSpheres);

        let sideWaterHBonds = model.getHBonds(water,sideChains);
        if(sideWaterHBonds.length>0){
            let sideWaterHBondPrimitiveInfo = contactsToCappedCylindersInfo(sideWaterHBonds,0.05,blackColours,true);
            sideWaterHBondPrimitiveInfo["display_class"] = "neighbourhood";
            objects.push(sideWaterHBondPrimitiveInfo);
        }
    }

    /*
       // FIXME - are these required? Get a funny HBond with 8a3h.
    let mainWaterHBonds = model.getHBonds(water,mainChains);
    let mainWaterHBondPrimitiveInfo = contactsToCappedCylindersInfo(mainWaterHBonds,0.05,blackColours,true);
    objects.push(mainWaterHBondPrimitiveInfo);
    */

    let waterWaterHBonds = model.getHBonds(water,water);
    if(waterWaterHBonds.length>0){
        let waterWaterHBondPrimitiveInfo = contactsToCappedCylindersInfo(waterWaterHBonds,0.05,blackColours,true);
        waterWaterHBondPrimitiveInfo["display_class"] = "neighbourhood";
        objects.push(waterWaterHBondPrimitiveInfo);
    }

    let baseAtoms = model.getAtoms("base");
    if(baseAtoms.length>0){
        let base_contacts = model.SeekContacts(baseAtoms,baseAtoms,0.6,1.6);
        let basePrimitiveInfo = contactsToCylindersInfo(base_contacts,0.2,atomColoursByChainWithC);
        let baseSpheresInfo = atomsToSpheresInfo(baseAtoms,0.2,atomColoursByChainWithC);
        basePrimitiveInfo["display_class"] = "nucleic";
        baseSpheresInfo["display_class"] = "nucleic";
        objects.push(basePrimitiveInfo);
        objects.push(baseSpheresInfo);
    }

    let nucleic_atoms = model.getAtoms("nucleic");
    if(nucleic_atoms.length>0){
        let blockPrimitiveInfo = getBaseBlocks(nucleic_atoms,0.2,atomColoursByChainWithC);
        blockPrimitiveInfo["display_class"] = "nucleic";
        objects.push(blockPrimitiveInfo);
    }

    let metal_atoms = model.getAtoms("metal");
    if(metal_atoms.length>0){
        let metalSpheresInfo = atomsToSpheresInfo(metal_atoms,0.6,atomColours2);
        metalSpheresInfo["display_class"] = "metal";
        objects.push(metalSpheresInfo);
    }
    console.log("Time to do everything: "+(new Date().getTime()-start));

    function checkOverlapWithBond(contact){
        // Check with 1kpe.
        let cAt1 = contact[1];
        let cAt2 = contact[2];

        if(cAt1.bonds.indexOf(cAt2)>-1){
            return false;
        }
        // Here we see if this contact is broadly parallel to an existing known bond, and if so reject it.
        // This probably belongs in the CloseContacts method.
        let mc = vec3.create();
        vec3.set(mc,cAt1.x()-cAt2.x(),cAt1.y()-cAt2.y(),cAt1.z()-cAt2.z());
        NormalizeVec3(mc);
        for(let ib=0;ib<cAt1.bonds.length;ib++){
            let mb = vec3.create();
            vec3.set(mb,cAt1.x()-cAt1.bonds[ib].x(),cAt1.y()-cAt1.bonds[ib].y(),cAt1.z()-cAt1.bonds[ib].z());
            NormalizeVec3(mb);
            if(vec3.dot(mb,mc)>0.7){
                return false;
            }
        }

        return true;
    }

    if(ligandAtoms.length>0){
        console.log("Getting metals");
        let metalsInBindingSite = model.getAtoms("allmetal and neighb cid=\"ligands\" group=atom maxd=4.0 exclude=water");
        console.log("Got metals");
        if(metalsInBindingSite.length>0){
            // FIXME - Should check metal distances.
            console.log("Getting close contacts");
            let metalContacts = model.CloseContacts(metalsInBindingSite,allAtoms,0.0,4.0,true);
            console.log("Got close contacts");
            metalContacts = metalContacts.filter(checkOverlapWithBond);
            console.log("Filtered close contacts");
            let redColours = colourScheme.colourOneColour([1.0,0.0,0.0,1.0]);
            let contactsPrimitiveInfo = contactsToCappedCylindersInfo(metalContacts,0.05,redColours,true);
            console.log("Got close contacts primitives");
            contactsPrimitiveInfo["display_class"] = "metal";
            objects.push(contactsPrimitiveInfo);
            console.log("Added close contacts primitives");
        }
    }


    let glycoBlocks = getGlycoBlocks(model,0.2,colourScheme);
    for(let iglyco=0;iglyco<glycoBlocks.length;iglyco++){
        console.log(glycoBlocks[iglyco]);
        glycoBlocks[iglyco]["display_class"] = "glyco";
    }
    console.log(glycoBlocks);
    Array.prototype.push.apply(objects,glycoBlocks);

    return objects;
 
}

const wizards = {"Bonds":wizardBonds,"Ribbons by chain":wizardRibbonsByChain,"Ribbons by secondary structure":wizardRibbons,"Worms":wizardWorms,"Site and ribbons by chain":wizardSiteAndRibbonsByChain,"CA trace":wizardCATrace};

export {wizards};
