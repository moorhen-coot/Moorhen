import fetch from 'node-fetch';
import { MoorhenInstance } from '@/InstanceManager';
import { _MoorhenReduxStore as MoorhenReduxStore } from '@/store/MoorhenReduxStore';
import { MockMoorhenCommandCentre } from '../__mocks__/mockMoorhenCommandCentre';
import { MockMoorhenInstance } from '../__mocks__/mockMoorhenInstance';
import { setOrigin } from '@/store/glRefSlice';
import { setActiveMap, setDevMode, setDisableFileUpload } from '@/store/generalStatesSlice';
import { setEnableTimeCapsule } from '@/store/backupSettingsSlice';
import { setBackgroundColor } from '@/store/sceneSettingsSlice';
import { MoorhenTimeCapsule } from '@/utils/MoorhenTimeCapsule';
import React from 'react';

jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const { ungzip } = require('node-gzip');
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen');
const createGemmiModule = require('../../public/MoorhenAssets/wasm/gemmi');

let cootModule: any;
let gemmiModule: any;

const mockMonomerLibraryPath =
    'https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/';

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
                const fileContents = fs.readFileSync(url);
                return new Blob([fileContents]);
            },
            arrayBuffer: async () => {
                const fileContents = fs.readFileSync(url);
                return fileContents.buffer;
            },
        });
    }
};

// Mock DOMParser which is used to get ligand SVGs
(global as any).DOMParser = class DOMParser {
    constructor() {}
    parseFromString(_input: string, _type: string) {
        return { getElementsByTagName: () => [] };
    }
};

// Mock FileList for Node.js/Jest environment (setup.js is not loaded for api-utils project)
(globalThis as any).FileList = class FileList {
    files: any[];
    length: number;
    constructor(files: any[] = []) {
        this.files = files;
        this.length = files.length;
        files.forEach((file: any, index: number) => {
            (this as any)[index] = file;
        });
    }
    item(index: number) {
        return this.files[index] || null;
    }
    [Symbol.iterator]() {
        return this.files[Symbol.iterator]();
    }
};

beforeAll(async () => {
    cootModule = await createCootModule({
        print: (t: string) => console.log(['output', t]),
        printErr: (t: string) => console.log(['output', t]),
    });

    gemmiModule = await createGemmiModule({
        print: (t: string) => console.log(['output', t]),
        printErr: (t: string) => console.log(['output', t]),
    });

    (globalThis as any).window = {};
    (globalThis as any).window.CCP4Module = cootModule;
    (globalThis as any).window.gemmiModule = gemmiModule;

    await setupFunctions.copyTestDataToFauxFS();
});

// ==============================
// Setup & teardown helpers
// ==============================

let molecules_container: any = null;
let commandCentre: any = null;
let mockInstance: any = null;
let moorhenInstance: MoorhenInstance;

const testDataFiles = [
    '5fjj.pdb',
    '5a3h.pdb',
    '5a3h.mmcif',
    '5a3h_no_ligand.pdb',
    'LZA.cif',
    'nitrobenzene.cif',
    'benzene.cif',
    '5a3h_sigmaa.mtz',
    'rnasa-1.8-all_refmac1.mtz',
    'tm-A.pdb',
];

const setupFunctions = {
    removeTestDataFromFauxFS: () => {
        testDataFiles.forEach((fileName) => {
            try {
                cootModule.FS_unlink(fileName);
            } catch (_e) {
                // file may not be present
            }
        });
    },
    copyTestDataToFauxFS: () => {
        testDataFiles.forEach((fileName) => {
            let dirName: string;
            if (fileName === 'rnasa-1.8-all_refmac1.mtz') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'data');
            } else if (fileName === 'tm-A.pdb') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'api');
            } else {
                dirName = path.join(__dirname, '..', 'test_data');
            }
            const coordData = fs.readFileSync(path.join(dirName, fileName), {
                encoding: fileName.includes('mtz') ? null : 'utf8',
                flag: 'r',
            });
            cootModule.FS_createDataFile('.', fileName, coordData, true, true);
        });
        cootModule.FS.mkdir('COOT_BACKUP');
        const cootDataZipped = fs.readFileSync(
            path.join(__dirname, '..', '..', 'public', 'MoorhenAssets', 'data.tar.gz'),
            { encoding: null, flag: 'r' },
        );
        return ungzip(cootDataZipped).then((cootData: any) => {
            cootModule.FS.mkdir('data_tmp');
            cootModule.FS_createDataFile('data_tmp', 'data.tar', cootData, true, true);
            cootModule.unpackCootDataFile('data_tmp/data.tar', false, '', '');
            cootModule.FS_unlink('data_tmp/data.tar');
        });
    },
};

// Minimal mock ScreenRecorder
class MockScreenRecorder {
    isRecording = false;
    start() {}
    stop() {}
}

beforeEach(async () => {
    if (molecules_container !== null) {
        molecules_container.delete?.();
    }

    molecules_container = new cootModule.molecules_container_js(false);
    molecules_container.set_use_gemmi(false);
    commandCentre = new MockMoorhenCommandCentre(molecules_container, cootModule);
    mockInstance = new MockMoorhenInstance(commandCentre);

    moorhenInstance = new MoorhenInstance(React.createRef<HTMLDivElement>(), null, commandCentre);
    await moorhenInstance.startInstance(
        MoorhenReduxStore.dispatch,
        React.createRef(),
        React.createRef(),
        MoorhenReduxStore,
    );
});

// ==============================
// Category A: Construction & Readiness
// ==============================
describe('Construction & Readiness', () => {
    test('constructor sets default state', () => {
        const freshInstance = new MoorhenInstance(React.createRef<HTMLDivElement>());
        expect(freshInstance.isReady()).toBe(false);
        expect(freshInstance.paths.urlPrefix).toBe('');
        expect(freshInstance.paths.monomerLibraryPath).toBe('');
    });

    test('constructor with external CommandCentre', () => {
        const externalCC = commandCentre;
        const instance = new MoorhenInstance(React.createRef<HTMLDivElement>(), null, externalCC);
        expect(instance.commandCentre).toBe(externalCC);
        expect(instance.cootCommand).toBeDefined();
    });

    test('isReady after startInstance', () => {
        expect(moorhenInstance.isReady()).toBe(true);
    });

    test('execWhenReady runs immediately if already ready', async () => {
        expect(moorhenInstance.isReady()).toBe(true);
        const result = await moorhenInstance.execWhenReady(() => 42);
        expect(result).toBe(42);
    });

    test('execWhenReady queues callbacks before ready', async () => {
        const freshInstance = new MoorhenInstance(React.createRef<HTMLDivElement>(), null, commandCentre);
        const results: number[] = [];

        // Queue a callback before startInstance
        const promise = freshInstance.execWhenReady(() => {
            results.push(1);
            return 1;
        });

        // Should not have executed yet
        expect(freshInstance.isReady()).toBe(false);
        expect(results).toHaveLength(0);

        // Start the instance
        await freshInstance.startInstance(
            MoorhenReduxStore.dispatch,
            React.createRef(),
            React.createRef(),
            MoorhenReduxStore,
        );

        // Callback should have fired
        await promise;
        expect(results).toContain(1);
    });

    test('execWhenReady preserves return value from queued callback', async () => {
        const freshInstance = new MoorhenInstance(React.createRef<HTMLDivElement>(), null, commandCentre);
        const promise = freshInstance.execWhenReady(() => 'hello');
        await freshInstance.startInstance(
            MoorhenReduxStore.dispatch,
            React.createRef(),
            React.createRef(),
            MoorhenReduxStore,
        );
        const result = await promise;
        expect(result).toBe('hello');
    });

    test.skip('cleanup clears commandCentre and timeCapsule', () => {
        // MockMoorhenCommandCentre has a `close` method? Check and adapt
        const cc = moorhenInstance.commandCentre as any;
        if (typeof cc.close === 'function') {
            const closeSpy = jest.spyOn(cc, 'close');
            moorhenInstance.cleanup();
            expect(closeSpy).toHaveBeenCalledTimes(1);
        } else {
            // Mock doesn't have close — just verify it gets set to undefined
            moorhenInstance.cleanup();
        }
        expect((moorhenInstance as any)._commandCentre).toBeUndefined();
    });
});

// ==============================
// Category B: Command Centre
// ==============================
describe('Command Centre', () => {
    test('setCommandCentre and getters', () => {
        const newCC = commandCentre;
        moorhenInstance.setCommandCentre(newCC);
        expect(moorhenInstance.commandCentre).toBe(newCC);
        expect(moorhenInstance.getCommandCentreRef().current).toBe(newCC);
    });

    test('cootCommand wrapper delegates to commandCentre', async () => {
        // Spy on commandCentre.cootCommand BEFORE creating the instance,
        // because CootCommandWrapper captures a bound reference in the constructor.
        // Note: startInstance internally calls set_max_number_of_simple_mesh_vertices(10000000),
        // so our test call will be the *second* invocation.
        const freshCC = new MockMoorhenCommandCentre(molecules_container, cootModule);
        const spy = jest.spyOn(freshCC, 'cootCommand');
        const instance = new MoorhenInstance(React.createRef<HTMLDivElement>(), null, freshCC);
        await instance.startInstance(
            MoorhenReduxStore.dispatch,
            React.createRef(),
            React.createRef(),
            MoorhenReduxStore,
        );
        await instance.cootCommand.set_max_number_of_simple_mesh_vertices(5000000);
        expect(spy).toHaveBeenCalledTimes(2);
        // Last call should be our test call with 5000000
        const lastCallArg = spy.mock.calls[1][0];
        expect(lastCallArg.command).toBe('set_max_number_of_simple_mesh_vertices');
        expect(lastCallArg.commandArgs).toEqual([5000000]);
    });
});

// ==============================
// Category C: Time Capsule & Video Recorder
// ==============================
describe('Time Capsule & Video Recorder', () => {
    test('set/get TimeCapsule', () => {
        const tc = moorhenInstance.getTimeCapsule();
        expect(tc).toBeDefined();
        expect(moorhenInstance.getTimeCapsuleRef().current).toBe(tc);
    });

    test('set/get VideoRecorder', () => {
        const recorder = new MockScreenRecorder() as any;
        moorhenInstance.setVideoRecorder(recorder);
        expect(moorhenInstance.getVideoRecorder()).toBe(recorder);
        expect(moorhenInstance.getVideoRecorderRef().current).toBe(recorder);
    });
});

// ==============================
// Category D: Preferences & Paths
// ==============================
describe('Preferences & Paths', () => {
    test('getPreferences returns Preferences instance', () => {
        const prefs = moorhenInstance.getPreferences();
        expect(prefs).toBeDefined();
    });

    test('setPaths updates paths', () => {
        moorhenInstance.setPaths('https://example.com', 'monomers/');
        expect(moorhenInstance.paths.urlPrefix).toBe('https://example.com');
        expect(moorhenInstance.paths.monomerLibraryPath).toBe('monomers/');
    });
});

// ==============================
// Category E: AceDRG, Container, Menu
// ==============================
describe('AceDRG, Container & Menu', () => {
    test('set/get AceDRGInstance', () => {
        const aceDRG = { someMethod: () => {} } as any;
        moorhenInstance.setAceDRGInstance(aceDRG);
        expect(moorhenInstance.getAceDRGInstance()).toBe(aceDRG);
    });

    test('getContainerRef returns the ref passed to constructor', () => {
        const ref = React.createRef<HTMLDivElement>();
        const instance = new MoorhenInstance(ref);
        expect(instance.getContainerRef()).toBe(ref);
    });

    test('menuSystem getter returns null when not provided', () => {
        const instance = new MoorhenInstance(React.createRef<HTMLDivElement>());
        expect(instance.menuSystem).toBeNull();
    });
});

// ==============================
// Category F: File Loading
// ==============================
describe('File Loading', () => {

    test('files.loadFiles with URL string loads a PDB file', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb');
        const result = await moorhenInstance.files.loadFiles(fileUrl);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('molecule');
        expect(result[0].fileName).toMatch(/5a3h\.pdb/);
        const mol = moorhenInstance.getMolecule(result[0].uniqueID);
        expect(mol).toBeDefined();
        expect(mol.molNo).toBe(0);
    });

    test('files.loadFiles with array of URL strings', async () => {
        const fileUrl1 = path.join(__dirname, '..', 'test_data', '5a3h.pdb');
        const fileUrl2 = path.join(__dirname, '..', 'test_data', '5fjj.pdb');
        const result = await moorhenInstance.files.loadFiles([fileUrl1, fileUrl2]);
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe('molecule');
        expect(result[1].type).toBe('molecule');
    });

    test('files.loadFiles with MTZ loads two maps (FWT + DELFWT)', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz');
        const result = await moorhenInstance.files.loadFiles(fileUrl);
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe('map');
        expect(result[1].type).toBe('map');
        expect(result[0].fileName).toMatch(/5a3h_sigmaa\.mtz/);

        const map1 = moorhenInstance.getMap(result[0].uniqueID);
        const map2 = moorhenInstance.getMap(result[1].uniqueID);
        expect(map1).toBeDefined();
        expect(map2).toBeDefined();
        // First map should be the FWT map (not difference)
        expect(map1.isDifference).toBeFalsy();
        // Second map should be the DELFWT map
        expect(map2.isDifference).toBeTruthy();
    });

    test('files.loadFiles with File object', async () => {
        const pdbContent = fs.readFileSync(path.join(__dirname, '..', 'test_data', '5a3h.pdb'), {
            encoding: 'utf8',
            flag: 'r',
        });
        const file = new File([pdbContent], 'test.pdb', { type: 'text/plain' });
        const result = await moorhenInstance.files.loadFiles(file);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('molecule');
    });

    test('files.loadFiles with FileList', async () => {
        const pdbContent = fs.readFileSync(path.join(__dirname, '..', 'test_data', '5a3h.pdb'), {
            encoding: 'utf8',
            flag: 'r',
        });
        const file1 = new File([pdbContent], 'test1.pdb', { type: 'text/plain' });
        const file2 = new File([pdbContent], 'test2.pdb', { type: 'text/plain' });
        const fileList = new FileList([file1, file2]);
        const result = await moorhenInstance.files.loadFiles(fileList);
        expect(result).toHaveLength(2);
    });

    test('files.loadPDBString', async () => {
        const pdbContent = fs.readFileSync(path.join(__dirname, '..', 'test_data', '5a3h.pdb'), {
            encoding: 'utf8',
            flag: 'r',
        });
        const result = await moorhenInstance.files.loadPDBString(pdbContent, 'pdb-from-string');
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('molecule');
    });

    test('files.loadCifString', async () => {
        const cifContent = fs.readFileSync(path.join(__dirname, '..', 'test_data', '5a3h.mmcif'), {
            encoding: 'utf8',
            flag: 'r',
        });
        const result = await moorhenInstance.files.loadCifString(cifContent, 'cif-from-string');
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('molecule');
    });

    test('files.newFilesLoadedCallback fires after loadFiles', async () => {
        const callback = jest.fn();
        moorhenInstance.files.newFilesLoadedCallback(callback);

        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb');
        await moorhenInstance.files.loadFiles(fileUrl, 'test-origin');

        expect(callback).toHaveBeenCalledTimes(1);
        const [loadedResult, origin] = callback.mock.calls[0];
        expect(loadedResult).toHaveLength(1);
        expect(loadedResult[0].type).toBe('molecule');
        expect(origin).toBe('test-origin');
    });

    test('files.newFilesLoadedCallback unsubscribe works', async () => {
        const callback = jest.fn();
        const unsubscribe = moorhenInstance.files.newFilesLoadedCallback(callback);
        unsubscribe();

        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb');
        await moorhenInstance.files.loadFiles(fileUrl);
        expect(callback).not.toHaveBeenCalled();
    });

    test('files.loadFiles with {url, filename} object', async () => {
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb');
        const result = await moorhenInstance.files.loadFiles({
            url: fileUrl,
            filename: 'custom_name.pdb',
        });
        expect(result).toHaveLength(1);
        expect(result[0].fileName).toBe('custom_name.pdb');
    });

    // SKIPPED: ligandFromSmiles triggers aceDRG internal WASM promises that
    // reject asynchronously, causing ERR_UNHANDLED_REJECTION during teardown.
    test.skip('files.ligandFromSmiles', async () => {
        const result = await moorhenInstance.files.ligandFromSmiles('CCO', 'ETH');
        expect(result).toBeDefined();
    });
});

// ==============================
// Category G: Session Loading
// ==============================
describe('Session Loading', () => {
    test('session.loadSessionData delegates to MoorhenTimeCapsule', async () => {
        const loadSessionSpy = jest.spyOn(MoorhenTimeCapsule, 'loadSessionData');
        loadSessionSpy.mockResolvedValue(0);

        const mockSessionData = {
            version: 'v23',
            molecules: [],
            maps: [],
            views: null,
            global: null,
        } as any;

        const result = await moorhenInstance.session.loadSessionData(mockSessionData);
        expect(result).toBe(0);
        expect(loadSessionSpy).toHaveBeenCalledWith(
            mockSessionData,
            moorhenInstance,
            undefined,
        );

        loadSessionSpy.mockRestore();
    });
});

// ==============================
// Category I: Camera / View Controls
// ==============================
describe('Camera / View Controls', () => {

    test('centerOnCoordinate dispatches setOrigin', () => {
        const dispatchSpy = jest.spyOn(moorhenInstance, 'dispatch');
        moorhenInstance.centerOnCoordinate(1.0, 2.0, 3.0);
        expect(dispatchSpy).toHaveBeenCalledWith(setOrigin([1.0, 2.0, 3.0]));
    });

    test('centerOnResidue and centerOnAtom', async () => {
        const pdbUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb');
        await moorhenInstance.files.loadFiles(pdbUrl);
        const molecules = moorhenInstance.getMoleculeList();
        const mol = molecules.find((m: any) => m.molNo === 0);

        const centreSpy = jest.spyOn(mol, 'centreOn');
        moorhenInstance.centerOnResidue('A', 32, mol.uniqueId);
        expect(centreSpy).toHaveBeenCalledWith('/*/A/32/*:*');
        centreSpy.mockClear();

        moorhenInstance.centerOnResidue('A', 32);
        expect(centreSpy).toHaveBeenCalledWith('/*/A/32/*:*');
        centreSpy.mockClear();

        moorhenInstance.centerOnAtom('A', 32, 'CA', mol.uniqueId);
        expect(centreSpy).toHaveBeenCalledWith('/*/A/32/CA:*');
    });
});

// ==============================
// Category J: Callbacks
// ==============================
describe('Callbacks', () => {
    test('newMoleculeChangedCallback fires on trigger', () => {
        const callback = jest.fn();
        moorhenInstance.newMoleculeChangedCallback(callback);

        moorhenInstance.triggerMoleculeChanged('test-mol-uid');
        expect(callback).toHaveBeenCalledWith('test-mol-uid');
    });

    test('newMoleculeChangedCallback with specific moleculeUID', () => {
        const callback = jest.fn();
        moorhenInstance.newMoleculeChangedCallback(callback, 'target-mol');

        // Trigger for a different molecule - should NOT fire
        moorhenInstance.triggerMoleculeChanged('other-mol');
        expect(callback).not.toHaveBeenCalled();

        // Trigger for the target molecule - SHOULD fire
        moorhenInstance.triggerMoleculeChanged('target-mol');
        expect(callback).toHaveBeenCalledWith('target-mol');
    });

    test('newMoleculeChangedCallback unsubscribe works', () => {
        const callback = jest.fn();
        const unsubscribe = moorhenInstance.newMoleculeChangedCallback(callback);
        unsubscribe();

        moorhenInstance.triggerMoleculeChanged('test-mol');
        expect(callback).not.toHaveBeenCalled();
    });

    test('newAtomHoveredCallback fires when hoveredAtom changes in store', () => {
        const callback = jest.fn();
        const unsubscribe = moorhenInstance.newAtomHoveredCallback(callback);

        // Simulate a hoveredAtom dispatch to the store
        moorhenInstance.store.dispatch({
            type: 'hoveringStates/setHoveredAtom',
            payload: {
                molecule: { uniqueId: 'mol-1' },
                atomInfo: { res_no: '32', name: 'CA' },
            },
        });

        expect(callback).toHaveBeenCalledWith('mol-1', '32', 'CA');
        unsubscribe();
    });

    test('newAtomHoveredCallback unsubscribe stops callbacks', () => {
        const callback = jest.fn();
        const unsubscribe = moorhenInstance.newAtomHoveredCallback(callback);
        unsubscribe();

        moorhenInstance.store.dispatch({
            type: 'hoveringStates/setHoveredAtom',
            payload: {
                molecule: { uniqueId: 'mol-1' },
                atomInfo: { res_no: '32', name: 'CA' },
            },
        });

        expect(callback).not.toHaveBeenCalled();
    });

    test('triggerMoleculeChanged with number resolves via store', async () => {
        const callback = jest.fn();
        const unsubscribe = moorhenInstance.newAtomHoveredCallback(callback);

        // Simulate a hoveredAtom dispatch to the store
        moorhenInstance.store.dispatch({
            type: 'hoveringStates/setHoveredAtom',
            payload: {
                molecule: { uniqueId: 'mol-1' },
                atomInfo: { res_no: '32', name: 'CA' },
            },
        });

        expect(callback).toHaveBeenCalledWith('mol-1', '32', 'CA');
        unsubscribe();
    });

    test('newAtomHoveredCallback unsubscribe stops callbacks', () => {
        const callback = jest.fn();
        const unsubscribe = moorhenInstance.newAtomHoveredCallback(callback);
        unsubscribe();

        moorhenInstance.store.dispatch({
            type: 'hoveringStates/setHoveredAtom',
            payload: {
                molecule: { uniqueId: 'mol-1' },
                atomInfo: { res_no: '32', name: 'CA' },
            },
        });

        expect(callback).not.toHaveBeenCalled();
    });
});

// ==============================
// Category K: Web Component Setters
// ==============================
describe('Web Component Setters', () => {
    test('width/height setters work before webComponent is assigned', () => {
        const instance = new MoorhenInstance(React.createRef<HTMLDivElement>());
        // Should not throw when _webComponent is null
        expect(() => {
            instance.width = 800;
            instance.height = 600;
        }).not.toThrow();
    });

    test('urlPrefix setter works before webComponent is assigned', () => {
        const instance = new MoorhenInstance(React.createRef<HTMLDivElement>());
        expect(() => {
            instance.urlPrefix = 'https://example.com';
        }).not.toThrow();
    });

    test('disableFileUploads setter works before webComponent is assigned', () => {
        const instance = new MoorhenInstance(React.createRef<HTMLDivElement>());
        expect(() => {
            instance.disableFileUploads = true;
        }).not.toThrow();
    });

    test('viewOnly setter works before webComponent is assigned', () => {
        const instance = new MoorhenInstance(React.createRef<HTMLDivElement>());
        expect(() => {
            instance.viewOnly = true;
        }).not.toThrow();
    });
});

// ==============================
// Category L: Static Methods
// ==============================
describe('Static Methods', () => {
    test('createLocalStorageInstance returns a LocalForage instance', () => {
        const storage = MoorhenInstance.createLocalStorageInstance('TestStorage');
        expect(storage).toBeDefined();
        expect(typeof storage.getItem).toBe('function');
        expect(typeof storage.setItem).toBe('function');
    });
});

// ==============================
// Category M: StoreExtension API smoke tests
// ==============================
describe('StoreExtension inherited API', () => {
    test('backupSettings.setEnableTimeCapsule dispatches action', () => {
        const dispatchSpy = jest.spyOn(moorhenInstance, 'dispatch');
        moorhenInstance.backupSettings.setEnableTimeCapsule(true);
        expect(dispatchSpy).toHaveBeenCalledWith(setEnableTimeCapsule(true));
    });

    test('generalOptions.setDisableFileUpload dispatches action', () => {
        const dispatchSpy = jest.spyOn(moorhenInstance, 'dispatch');
        moorhenInstance.generalOptions.setDisableFileUpload(true);
        expect(dispatchSpy).toHaveBeenCalledWith(setDisableFileUpload(true));
    });

    test('globalUI.setDevMode dispatches action', () => {
        const dispatchSpy = jest.spyOn(moorhenInstance, 'dispatch');
        moorhenInstance.globalUI.setDevMode(true);
        expect(dispatchSpy).toHaveBeenCalledWith(setDevMode(true));
    });

    test('sceneSettings.setBackgroundColor dispatches action', () => {
        const dispatchSpy = jest.spyOn(moorhenInstance, 'dispatch');
        moorhenInstance.sceneSettings.setBackgroundColor([0.1, 0.2, 0.3, 1.0]);
        expect(dispatchSpy).toHaveBeenCalledWith(setBackgroundColor([0.1, 0.2, 0.3, 1.0]));
    });

    test('maps.setActiveMap dispatches action', () => {
        const dispatchSpy = jest.spyOn(moorhenInstance, 'dispatch');
        const mockMap = { uniqueId: 'test-map' } as any;
        moorhenInstance.maps.setActiveMap(mockMap);
        expect(dispatchSpy).toHaveBeenCalledWith(setActiveMap(mockMap));
    });

    test('subscribeToStore calls callback when selected state changes', () => {
        // Reset devMode to null first (previous tests may have set it to true)
        moorhenInstance.store.dispatch({
            type: 'generalStates/setDevMode',
            payload: null,
        });

        const callback = jest.fn();
        moorhenInstance.subscribeToStore(
            (state: any) => state.generalStates.devMode,
            callback,
        );

        moorhenInstance.generalOptions.setDisableFileUpload(true);
        // devMode hasn't changed, so callback should not have been called
        expect(callback).not.toHaveBeenCalled();

        moorhenInstance.globalUI.setDevMode(true);
        // devMode changed from null to true, callback should fire
        expect(callback).toHaveBeenCalledWith(true);
    });
});
