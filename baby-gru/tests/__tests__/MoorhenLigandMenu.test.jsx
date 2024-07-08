jest.setTimeout(15000)
jest.mock('protvista-sequence')
jest.mock('protvista-navigation')
jest.mock('protvista-manager')
jest.mock('protvista-track')
jest.mock('chart.js', () => ({
    ...jest.requireActual('chart.js'),
    registerables: []
}))

import '@testing-library/jest-dom'
import { render, cleanup, screen, within }  from '@testing-library/react'
import { Provider } from 'react-redux'
import MoorhenStore from "../../src/store/MoorhenReduxStore"
import { createRef } from 'react'
import { MoorhenModalsContainer } from '../../src/components/misc/MoorhenModalsContainer'
import { MoorhenNavBar } from '../../src/components/navbar-menus/MoorhenNavBar'
import { MockWebGL } from '../__mocks__/mockWebGL'
import { MockMoorhenCommandCentre } from '../__mocks__/mockMoorhenCommandCentre'
import { act } from 'react-dom/test-utils'
import { setHoveredAtom } from '../../src/store/hoveringStatesSlice'
import { setCootInitialized, setDevMode } from '../../src/store/generalStatesSlice'
import { setDefaultBondSmoothness, setHeight, setIsDark, setWidth } from '../../src/store/sceneSettingsSlice'
import { overwriteMapUpdatingScores, setShowScoresToast } from '../../src/store/moleculeMapUpdateSlice'
import userEvent from '@testing-library/user-event'
import fetch from 'node-fetch'

const fs = require('fs')

let cootModule = null
let molecules_container = null
let collectedProps = null
let glRef = null
let commandCentre = null
let videoRecorderRef = null
let timeCapsuleRef = null
let moleculesRef = null
let mapsRef = null
let activeMapRef = null
let lastHoveredAtomRef = null
let onUserPreferencesChange = null
let urlPrefix = null
let monomerLibraryPath = null
let disableFileUploads = null
let includeNavBarMenuNames = null
let extraNavBarModals = null
let extraNavBarMenus = null
let extraFileMenuItems = null
let extraEditMenuItems = null
let extraCalculateMenuItems = null
let extraDraggableModals = null
let viewOnly = null
let allowScripting = null
let aceDRGInstance = null
let mockMonomerLibraryPath = null

const describeIfWasmExists = fs.existsSync('./moorhen.data') ? describe : describe.skip

describeIfWasmExists('Testing MoorhenLigandMenu', () => {
    
    beforeAll(() => {   
        const createCootModule = require('../../public/wasm/moorhen')

        mockMonomerLibraryPath = "https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/"

        global.fetch = (url) => {
            if (url.includes(mockMonomerLibraryPath)) {
                return fetch(url)
            } else if (url.includes('https:/files.rcsb.org/download/')) {
                return fetch(url)
            } else {
                return Promise.resolve({
                    ok: true,
                    text: async () => {
                        const fileContents = fs.readFileSync(`./public/${url}`, { encoding: 'utf8', flag: 'r' })
                        return fileContents
                    },
                    blob: async () => {
                        return {
                            arrayBuffer: async () => {
                                const fileContents = fs.readFileSync(`./public/${url}`)
                                const buff = fileContents.buffer
                                return buff
                            }    
                        }
                    }
                })
            }
        }

        return createCootModule({
            print(t) { () => console.log(["output", t]) },
            printErr(t) { () => console.log(["output", t]); }
        }).then(moduleCreated => {
            cootModule = moduleCreated
            global.window.CCP4Module = cootModule
            return Promise.resolve()
        })
    })
    
    beforeEach(() => {
        molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(false)
        molecules_container.set_show_timings(false)
        molecules_container.set_refinement_is_verbose(false)
        molecules_container.fill_rotamer_probability_tables()
        molecules_container.set_map_sampling_rate(1.7)
        molecules_container.set_map_is_contoured_with_thread_pool(true)
        molecules_container.set_max_number_of_threads(3)

        glRef = createRef(null)
        commandCentre = createRef(null)
        videoRecorderRef = createRef(null)
        timeCapsuleRef = createRef(null)
        moleculesRef = createRef(null)
        mapsRef = createRef(null)
        activeMapRef = createRef(null)
        lastHoveredAtomRef = createRef(null)

        onUserPreferencesChange = () => {}
        urlPrefix = '.'
        monomerLibraryPath = mockMonomerLibraryPath
        disableFileUploads = false
        includeNavBarMenuNames = []
        extraNavBarModals = []
        extraNavBarMenus = []
        extraFileMenuItems = []
        extraEditMenuItems = []
        extraCalculateMenuItems = []
        extraDraggableModals = []
        viewOnly = false
        allowScripting = true
        aceDRGInstance = null

        glRef.current = new MockWebGL()
        commandCentre.current = new MockMoorhenCommandCentre(molecules_container, cootModule)

        collectedProps = {
            glRef, commandCentre, timeCapsuleRef, disableFileUploads, extraDraggableModals, aceDRGInstance, 
            urlPrefix, viewOnly, mapsRef, allowScripting, extraCalculateMenuItems, extraEditMenuItems,
            extraNavBarMenus, monomerLibraryPath, moleculesRef, extraFileMenuItems, activeMapRef,
            videoRecorderRef, lastHoveredAtomRef, onUserPreferencesChange, extraNavBarModals, 
            includeNavBarMenuNames, onAtomHovered: () => {}, onKeyPress: () => {}
        }

        act(() => {
            MoorhenStore.dispatch(setHoveredAtom({
                molecule: null,
                cid: null,
            }))
            MoorhenStore.dispatch( setDevMode(false) )    
            MoorhenStore.dispatch( setIsDark(false) )    
            MoorhenStore.dispatch( setWidth(1600) )    
            MoorhenStore.dispatch( setHeight(900) )    
            MoorhenStore.dispatch( setCootInitialized(true) )
            MoorhenStore.dispatch( setDefaultBondSmoothness(1) )
            MoorhenStore.dispatch( overwriteMapUpdatingScores(['Rfactor', 'Rfree', 'Moorhen Points']) )
            MoorhenStore.dispatch( setShowScoresToast(true) )
        })
    })

    afterEach(cleanup)

    test.skip("Test MoorhenLigandMenu find ligand" , async () => {
        render(
            <Provider store={MoorhenStore}> 
                <MoorhenNavBar {...collectedProps}/>
                <MoorhenModalsContainer {...collectedProps}/>
            </Provider> 
        )

        const user = userEvent.setup()

        await user.click( screen.getByRole('button', { name: /moorhen/i }) )
        await user.click( screen.getByRole('menuitem', { name: /file/i }) )
        await user.click( screen.getByRole('menuitem', { name: /load tutorial data\.\.\./i }) )
        await user.click( screen.getByRole('button', { name: /ok/i }) )
        await user.click( screen.getByRole('menuitem', { name: /ligand/i }) )
        await user.click( screen.getByRole('menuitem', { name: /get monomer\.\.\./i }) )
        await user.type( screen.getByRole('textbox'), 'LZA' )
        await user.click( screen.getByRole('button', { name: /ok/i }) )
        await user.click( screen.getByRole('menuitem', { name: /ligand/i }) )
        await user.click( screen.getByRole('menuitem', { name: /find ligand\.\.\./i }) )


        const molecules = MoorhenStore.getState().molecules.moleculeList
        expect(molecules).toHaveLength(2)

        const ligandModalHeader = screen.getByText('Find ligand')
        expect(ligandModalHeader).toBeVisible()
        
    })
})
