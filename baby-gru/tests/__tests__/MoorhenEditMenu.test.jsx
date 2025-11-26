jest.setTimeout(35000)
jest.mock('protvista-sequence')
jest.mock('protvista-navigation')
jest.mock('protvista-manager')
jest.mock('protvista-track')
jest.mock('chart.js', () => ({
    ...jest.requireActual('chart.js'),
    registerables: []
}))

import '@testing-library/jest-dom'
import { render, cleanup, screen }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { createRef } from 'react'
import { act } from 'react-dom/test-utils'
import userEvent from '@testing-library/user-event'
import fetch from 'node-fetch'
import { _MoorhenReduxStore as MoorhenReduxStore} from "../../src/store/MoorhenReduxStore"
import { MoorhenModalsContainer } from '../../src/components/container/ModalsContainer'
// import { MoorhenNavBar } from '../../src/components/navbar-menus/MoorhenNavBar'
import { MockWebGL } from '../__mocks__/mockWebGL'
import { MockMoorhenCommandCentre } from '../__mocks__/mockMoorhenCommandCentre'
import { setHoveredAtom } from '../../src/store/hoveringStatesSlice'
import { setCootInitialized, setDevMode } from '../../src/store/generalStatesSlice'
import { setDefaultBondSmoothness, setHeight, setIsDark, setWidth } from '../../src/store/sceneSettingsSlice'
import { overwriteMapUpdatingScores, setShowScoresToast } from '../../src/store/moleculeMapUpdateSlice'
import moorhen_test_use_gemmi from '../MoorhenTestsSettings'

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

describeIfWasmExists('Testing MoorhenEditMenu', () => {

    beforeAll(() => {
        const createCootModule = require('../../public/moorhen')

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
                        const fileContents = fs.readFileSync(`./public/baby-gru/${url}`, { encoding: 'utf8', flag: 'r' })
                        return fileContents
                    },
                    blob: async () => {
                        return {
                            arrayBuffer: async () => {
                                const fileContents = fs.readFileSync(`./public/baby-gru/${url}`)
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
        molecules_container.set_use_gemmi(moorhen_test_use_gemmi)
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

        //glRef.current = new MockWebGL()
        commandCentre.current = new MockMoorhenCommandCentre(molecules_container, cootModule)

        collectedProps = {
            commandCentre, timeCapsuleRef, disableFileUploads, extraDraggableModals, aceDRGInstance,
            urlPrefix, viewOnly, mapsRef, allowScripting, extraCalculateMenuItems, extraEditMenuItems,
            extraNavBarMenus, monomerLibraryPath, moleculesRef, extraFileMenuItems, activeMapRef,
            videoRecorderRef, lastHoveredAtomRef, onUserPreferencesChange, extraNavBarModals,
            includeNavBarMenuNames, onAtomHovered: () => {}, onKeyPress: () => {}
        }

        act(() => {
            MoorhenReduxStore.dispatch(setHoveredAtom({
                molecule: null,
                cid: null,
            }))
            MoorhenReduxStore.dispatch( setDevMode(false) )
            MoorhenReduxStore.dispatch( setIsDark(false) )
            MoorhenReduxStore.dispatch( setWidth(1600) )
            MoorhenReduxStore.dispatch( setHeight(900) )
            MoorhenReduxStore.dispatch( setCootInitialized(true) )
            MoorhenReduxStore.dispatch( setDefaultBondSmoothness(1) )
            MoorhenReduxStore.dispatch( overwriteMapUpdatingScores(['Rfactor', 'Rfree', 'Moorhen Points']) )
            MoorhenReduxStore.dispatch( setShowScoresToast(true) )
        })
    })

    afterEach(cleanup)

    test("MoorhenEditMenu merge molecules" , async () => {
        render(
            <Provider store={MoorhenReduxStore}>
                {/* <MoorhenNavBar {...collectedProps}/> */}
                <MoorhenModalsContainer {...collectedProps}/>
            </Provider>
        )

        const user = userEvent.setup()

        const moorhenButton = screen.getByRole('button', { name: /moorhen/i })
        await user.click(moorhenButton)

        await user.click( screen.getByRole('menuitem', { name: /file/i }) )
        await user.click( screen.getByRole('menuitem', { name: /load tutorial data\.\.\./i }) )
        await user.click( screen.getByRole('button', { name: /ok/i }) )

        await user.click( screen.getByRole('menuitem', { name: /file/i }) )
        await user.click( screen.getByRole('menuitem', { name: /load tutorial data\.\.\./i }) )
        await user.selectOptions( screen.getByRole('combobox'), ['Tutorial 2'] )
        await user.click( screen.getByRole('button', { name: /ok/i }) )

        const visibleMolecules_1 = MoorhenReduxStore.getState().molecules.visibleMolecules
        expect(visibleMolecules_1).toEqual([0, 3])

        await user.click( screen.getByRole('menuitem', { name: /edit/i }) )
        await user.click( screen.getByRole('menuitem', { name: /merge molecules\.\.\./i }) )
        await user.selectOptions( screen.getAllByRole('combobox')[0], ['3: mol-2'] )
        await user.click( screen.getByRole('button', { name: /ok/i }) )

        const visibleMolecules_2 = MoorhenReduxStore.getState().molecules.visibleMolecules
        expect(visibleMolecules_2).toEqual([0])
    })
})
