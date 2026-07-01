import fetch from 'node-fetch';
import { MoorhenMap } from '../../src/utils/MoorhenMap';
import moorhen_test_use_gemmi from '../MoorhenTestsSettings';
import { _MoorhenReduxStore as MoorhenReduxStore } from '../../src/store/MoorhenReduxStore';
import { MockMoorhenCommandCentre } from '../__mocks__/mockMoorhenCommandCentre';
import { MoorhenInstance } from '@/InstanceManager';
import { MockMoorhenInstance } from '../__mocks__/mockMoorhenInstance'
import React from 'react';

jest.setTimeout(40000);

const fs = require('fs');
const path = require('path');
const { ungzip } = require('node-gzip');
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen');

let cootModule: any;

const mockMonomerLibraryPath = 'https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/';

(global as any).fetch = (url: string) => {
    if (url.includes(mockMonomerLibraryPath)) {
        return fetch(url);
    } else if (url.includes('https:/files.rcsb.org/download/')) {
        return fetch(url);
    } else {
        return Promise.resolve({
            ok: true,
            text: async () => {
                const fileContents = fs.readFileSync(url, { encoding: 'utf8', flag: 'r' });
                return fileContents;
            },
            blob: async () => {
                return {
                    arrayBuffer: async () => {
                        const fileContents = fs.readFileSync(url);
                        const buff = fileContents.buffer;
                        return buff;
                    },
                };
            },
            arrayBuffer: async () => {
                const fileContents = fs.readFileSync(url);
                const buff = fileContents.buffer;
                return buff;
            },
        });
    }
};

beforeAll(() => {
    return createCootModule({
        print(t: any) { () => console.log(['output', t]); },
        printErr(t: any) { () => console.log(['output', t]); },
    }).then((moduleCreated: any) => {
        cootModule = moduleCreated;
        (global as any).window = {
            CCP4Module: cootModule,
        };
        return setupFunctions.copyTestDataToFauxFS();

    });
});

let molecules_container: any = null;
let commandCentre: any = null;
let mockInstance: any = null;
let glRef: any = null;
let moorhenInstance: MoorhenInstance;

describe('Testing MoorhenMap', () => {

    beforeEach(async () => {
        if (molecules_container !== null) {
            molecules_container.delete?.();
        }
        
        molecules_container = new cootModule.molecules_container_js(false);
        molecules_container.set_use_gemmi(moorhen_test_use_gemmi);
        commandCentre = new MockMoorhenCommandCentre(molecules_container, cootModule);
        mockInstance = new MockMoorhenInstance(commandCentre);
        moorhenInstance = new MoorhenInstance(React.createRef(), null, commandCentre);        
        await moorhenInstance.startInstance(
            MoorhenReduxStore.dispatch,
            React.createRef(),
            React.createRef(),
            MoorhenReduxStore,
        );
    });

    test('loadToCootFromMtzURL', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        expect(map.molNo).toBe(0);
        const isValid = molecules_container.is_valid_map_molecule(map.molNo);
        expect(isValid).toBeTruthy();
    });

    test('loadToCootFromMtzURL --isDifference', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'DELFWT', PHI: 'PHDELWT', isDifference: true, useWeight: false, calcStructFact: false }); // already correct
        expect(map.molNo).toBe(0);
        expect(map.isDifference).toBeTruthy();
        const isValid = molecules_container.is_valid_map_molecule(map.molNo);
        expect(isValid).toBeTruthy();
    });

    test('auto load mtz', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const files = await moorhenInstance.files.loadFiles(fileUrl)
        const map_1 = moorhenInstance.getMap(files[0].uniqueID)
        const map_2 = moorhenInstance.getMap(files[1].uniqueID)
        expect(map_1.molNo).toBe(0);
        expect(map_1.isDifference).toBeFalsy;
        expect(map_2.molNo).toBe(1);
        expect(map_2.isDifference).toBeTruthy();
    })

    test('delete', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        expect(map.molNo).toBe(0);
        await map.delete();
        const isValid = molecules_container.is_valid_map_molecule(map.molNo);
        expect(isValid).toBeFalsy();
    });

    test('fetchIsDifferenceMap 1', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'DELFWT', PHI: 'PHDELWT', isDifference: true, useWeight: false, calcStructFact: false });
        expect(map.molNo).toBe(0);
        const isDifference = await map.fetchIsDifferenceMap();
        expect(isDifference).toBeTruthy();
    });

    test('fetchIsDifferenceMap 2', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        expect(map.molNo).toBe(0);
        const isDifference = await map.fetchIsDifferenceMap();
        expect(isDifference).toBeFalsy();
    });

    test('getSuggestedSettings', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        
        // const map = new MoorhenMap(moorhenInstance);
        const files = await moorhenInstance.files.loadFiles([fileUrl])
        console.log('Loaded files:', files.map(f => f.uniqueID));
        const map = moorhenInstance.getMap(files[0].uniqueID);

        expect(map.molNo).toBe(0);
        expect(map.isEM).toBeFalsy();
        expect(map.mapRmsd).toBeCloseTo(0.35, 1);
        expect(map.mapCentre[0]).toBeCloseTo(1.09, 1);
        expect(map.mapCentre[1]).toBeCloseTo(-0.17, 1);
        expect(map.mapCentre[2]).toBeCloseTo(2.94, 1);
        expect(map.suggestedContourLevel).toBeCloseTo(0.56, 1);
        expect(map.suggestedMapWeight).toBeCloseTo(42.24, 1);
        expect(map.suggestedRadius).toBeNull();
    });

    test('setDefaultColour', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');

        const map_1 = new MoorhenMap(mockInstance);
        await map_1.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        expect(map_1.molNo).toBe(0);
        expect(map_1.defaultMapColour.r).toBeCloseTo(0.30, 1);
        expect(map_1.defaultMapColour.g).toBeCloseTo(0.30, 1);
        expect(map_1.defaultMapColour.b).toBeCloseTo(0.69, 1);

        const map_diff = new MoorhenMap(mockInstance);
        await map_diff.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: true, useWeight: false, calcStructFact: false });
        expect(map_diff.molNo).toBe(1);

        const map_2 = new MoorhenMap(mockInstance);
        await map_2.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        expect(map_2.molNo).toBe(2);
        expect(map_2.defaultMapColour.r).toBeCloseTo(0.36, 1);
        expect(map_2.defaultMapColour.g).toBeCloseTo(0.30, 1);
        expect(map_2.defaultMapColour.b).toBeCloseTo(0.69, 1);
    });

    test('fetchMapRmsd', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        const rmsd = await map.fetchMapRmsd();
        expect(rmsd).toBeCloseTo(0.35, 1);
    });

    test('fetchMapMean', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        const mean = await map.fetchMapMean();
        expect(mean).toBeCloseTo(2.18e-10, 8);
    });

    test('getMapWeight', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        const mapWeight = await map.getMapWeight();
        expect(mapWeight).toBe(50);
    });

    test('setMapWeight', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        const mapWeight_1 = map.suggestedMapWeight;
        await map.setMapWeight();
        const mapWeight_2 = await map.getMapWeight();
        expect(mapWeight_2).toBeCloseTo(mapWeight_1, 1);
    });

    test('setActive', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        const f_1 = jest.spyOn(map, 'setMapWeight');
        await map.setActive();
        expect(f_1).toHaveBeenCalledTimes(1);
    });

    test('getHistogram', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        const histogramData = await map.getHistogram();
        expect(histogramData.base).toBeCloseTo(-1.01, 1);
        expect(histogramData.bin_width).toBeCloseTo(0.023, 2);
        expect(histogramData.counts).toHaveLength(200);
    });

    test.skip('doCootContour', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const map = new MoorhenMap(mockInstance);
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: 'FWT', PHI: 'PHWT', isDifference: false, useWeight: false, calcStructFact: false });
        const f_1 = jest.spyOn(glRef.current, 'buildBuffers');
        const f_2 = jest.spyOn(glRef.current, 'drawScene');
        await map.doCootContour(55, 10, 10, 30, 0.48, "solid");
        expect(f_1).toHaveBeenCalledTimes(1);
        expect(f_2).toHaveBeenCalledTimes(1);
        expect(glRef.current.buffers).toHaveLength(1);
        expect(glRef.current.buffers[0].vert_tri[0][0]).toHaveLength(1174200);
    });

});

const testDataFiles = ['5fjj.pdb', '5a3h.pdb', '5a3h.mmcif', '5a3h_no_ligand.pdb', 'LZA.cif', 'nitrobenzene.cif', 'benzene.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb'];

const setupFunctions = {
    removeTestDataFromFauxFS: () => {
        testDataFiles.forEach(fileName => {
            cootModule.FS_unlink(fileName);
        });
    },
    copyTestDataToFauxFS: () => {
        testDataFiles.forEach(fileName => {
            let dirName;
            if (fileName === 'rnasa-1.8-all_refmac1.mtz') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'data');
            } else if (fileName === 'tm-A.pdb') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'api');
            } else {
                dirName = path.join(__dirname, '..', 'test_data');
            }
            const coordData = fs.readFileSync(path.join(dirName, fileName), { encoding: fileName.includes('mtz') ? null : 'utf8', flag: 'r' });
            cootModule.FS_createDataFile('.', fileName, coordData, true, true);
        });
        cootModule.FS.mkdir('COOT_BACKUP');
        const cootDataZipped = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'MoorhenAssets', 'data.tar.gz'), { encoding: null, flag: 'r' });
        return ungzip(cootDataZipped).then((cootData: any) => {
            cootModule.FS.mkdir('data_tmp');
            cootModule.FS_createDataFile('data_tmp', 'data.tar', cootData, true, true);
            cootModule.unpackCootDataFile('data_tmp/data.tar', false, '', '');
            cootModule.FS_unlink('data_tmp/data.tar');
        });
    },
};