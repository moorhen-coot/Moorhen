jest.setTimeout(10000)

import '@testing-library/jest-dom'
import { render, screen, cleanup, within }  from '@testing-library/react'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import { createRef } from 'react'
import { MoorhenReduxStore } from "../../src/store/MoorhenReduxStore"
import { MoorhenNavBar }  from '../../src/components/navbar-menus/MoorhenNavBar'
import { setHoveredAtom } from '../../src/store/hoveringStatesSlice'
import { setCootInitialized, setDevMode } from '../../src/store/generalStatesSlice'
import { setHeight, setIsDark, setWidth } from '../../src/store/sceneSettingsSlice'

let collectedProps = null
let navBarRef = null
let glRef = null
let commandCentre = null
let timeCapsuleRef = null
let activeMapRef = null
let mapsRef = null
let moleculesRef = null
let videoRecorderRef = null
let lastHoveredAtomRef = null

describe.skip('Testing MoorhenNavBar', () => {

    beforeEach(() => {
        navBarRef = createRef(null)
        glRef = createRef(null)
        commandCentre = createRef(null)
        timeCapsuleRef = createRef(null)
        activeMapRef = createRef(null)
        mapsRef = createRef(null)
        moleculesRef = createRef(null)
        videoRecorderRef = createRef(null)
        lastHoveredAtomRef = createRef(null)

        collectedProps = {
            glRef,
            commandCentre,
            timeCapsuleRef,
            activeMapRef,
            mapsRef,
            moleculesRef,
            videoRecorderRef,
            lastHoveredAtomRef,
            onUserPreferencesChange: () => {},
            urlPrefix: '.',
            monomerLibraryPath: "https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/",
            disableFileUploads: false,
            includeNavBarMenuNames: [],
            extraNavBarModals: [],
            extraNavBarMenus: [],
            extraFileMenuItems: [],
            extraEditMenuItems: [],
            extraCalculateMenuItems: [],
            extraDraggableModals: [],
            viewOnly: false,
            allowScripting: true,
            aceDRGInstance: null,
        }

        MoorhenReduxStore.dispatch(setHoveredAtom({
            molecule: null,
            cid: null,
        }))
        MoorhenReduxStore.dispatch( setDevMode(false) )
        MoorhenReduxStore.dispatch( setIsDark(false) )
        MoorhenReduxStore.dispatch( setWidth(1600) )
        MoorhenReduxStore.dispatch( setHeight(900) )
        MoorhenReduxStore.dispatch( setCootInitialized(true) )
    })

    afterEach(cleanup)

    test('MoorhenNavBar render', async () => {
        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNavBar ref={navBarRef} {...collectedProps}/>
            </Provider>
        )

        const button = screen.getByRole('button', { name: /moorhen/i })
        const icon = screen.getByRole('img', { name: /moorhen/i })
        const menu_hidden = screen.queryByRole('menu')
        expect(button).toBeInTheDocument()
        expect(button).toBeVisible()
        expect(icon).toBeInTheDocument()
        expect(icon).toBeVisible()
        expect(menu_hidden).not.toBeInTheDocument()

        const user = userEvent.setup()
        await user.click(button)

        const menu = screen.getByRole('menu')
        const file = screen.getByRole('menuitem', { name: /file/i })
        const edit = screen.getByRole('menuitem', { name: /edit/i })
        const calculate = screen.getByRole('menuitem', { name: /calculate/i })
        const validation = screen.getByRole('menuitem', { name: /validation/i })
        const ligand = screen.getByRole('menuitem', { name: /ligand/i })
        const mapTools = screen.getByRole('menuitem', { name: /map tools/i })
        const models = screen.getByRole('menuitem', { name: /models/i })
        const maps = screen.getByRole('menuitem', { name: /maps/i })
        const history = screen.getByRole('menuitem', { name: /history/i })
        const preferences = screen.getByRole('menuitem', { name: /preferences/i })
        const help = screen.getByRole('menuitem', { name: /help/i })
        expect(menu).toBeInTheDocument()
        expect(file).toBeInTheDocument()
        expect(file).toBeVisible()
        expect(edit).toBeInTheDocument()
        expect(edit).toBeVisible()
        expect(calculate).toBeInTheDocument()
        expect(calculate).toBeVisible()
        expect(validation).toBeInTheDocument()
        expect(validation).toBeVisible()
        expect(ligand).toBeInTheDocument()
        expect(ligand).toBeVisible()
        expect(mapTools).toBeInTheDocument()
        expect(mapTools).toBeVisible()
        expect(models).toBeInTheDocument()
        expect(models).toBeVisible()
        expect(maps).toBeInTheDocument()
        expect(maps).toBeVisible()
        expect(help).toBeInTheDocument()
        expect(help).toBeVisible()
        expect(history).toBeInTheDocument()
        expect(history).toBeVisible()
        expect(preferences).toBeInTheDocument()
        expect(preferences).toBeVisible()
    })

    test('MoorhenNavBar render with extra menus', async () => {

        collectedProps.extraNavBarMenus = [{
            name: 'test',
            ref: createRef(null),
            JSXElement: <div>Test extra navBar menus</div>
        }]

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNavBar ref={navBarRef} {...collectedProps}/>
            </Provider>
        )

        const button = screen.getByRole('button', { name: /moorhen/i })

        const user = userEvent.setup()
        await user.click(button)

        const testMenuItem = screen.getByRole('menuitem', { name: /test/i })
        const testButton = within(testMenuItem).getByRole('button')
        expect(testMenuItem).toBeInTheDocument()
        expect(testMenuItem).toBeVisible()
        expect(testButton).toBeInTheDocument()
        expect(testButton).toBeVisible()

        await user.click(testButton)

        const testMenuPopover = screen.getByText(/test extra navbar menus/i)
        expect(testMenuPopover).toBeInTheDocument()
        expect(testMenuPopover).toBeVisible()
    })

    test('MoorhenNavBar render with specific menu items', async () => {

        collectedProps.includeNavBarMenuNames = ['History' , 'Ligand', 'File', 'Calculate']

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNavBar ref={navBarRef} {...collectedProps}/>
            </Provider>
        )

        const button = screen.getByRole('button', { name: /moorhen/i })

        const user = userEvent.setup()
        await user.click(button)

        const file = screen.queryByRole('menuitem', { name: /file/i })
        const edit = screen.queryByRole('menuitem', { name: /edit/i })
        const calculate = screen.queryByRole('menuitem', { name: /calculate/i })
        const validation = screen.queryByRole('menuitem', { name: /validation/i })
        const ligand = screen.queryByRole('menuitem', { name: /ligand/i })
        const mapTools = screen.queryByRole('menuitem', { name: /map tools/i })
        const models = screen.queryByRole('menuitem', { name: /models/i })
        const maps = screen.queryByRole('menuitem', { name: /maps/i })
        const history = screen.queryByRole('menuitem', { name: /history/i })
        const preferences = screen.queryByRole('menuitem', { name: /preferences/i })
        const help = screen.queryByRole('menuitem', { name: /help/i })
        expect(file).toBeInTheDocument()
        expect(file).toBeVisible()
        expect(calculate).toBeInTheDocument()
        expect(calculate).toBeVisible()
        expect(ligand).toBeInTheDocument()
        expect(ligand).toBeVisible()
        expect(history).toBeInTheDocument()
        expect(history).toBeVisible()
        expect(edit).not.toBeInTheDocument()
        expect(validation).not.toBeInTheDocument()
        expect(mapTools).not.toBeInTheDocument()
        expect(models).not.toBeInTheDocument()
        expect(maps).not.toBeInTheDocument()
        expect(help).not.toBeInTheDocument()
        expect(preferences).not.toBeInTheDocument()

        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems.map(item => item.textContent)).toEqual(collectedProps.includeNavBarMenuNames)
    })

    test('MoorhenNavBar click interactions', async () => {

        render(
            <Provider store={MoorhenReduxStore}>
                <MoorhenNavBar ref={navBarRef} {...collectedProps}/>
                <button>Dummy button</button>
            </Provider>
        )

        const button = screen.getByRole('button', { name: /moorhen/i })

        const user = userEvent.setup()
        await user.click(button)

        const fileMenuItem = screen.queryByRole('menuitem', { name: /file/i })
        const fileButton = within(fileMenuItem).getByRole('button')
        const editMenuItem = screen.queryByRole('menuitem', { name: /edit/i })
        const editButton = within(editMenuItem).getByRole('button')
        const calculateMenuItem = screen.queryByRole('menuitem', { name: /calculate/i })
        const calculateButton = within(calculateMenuItem).getByRole('button')
        expect(fileButton).toBeInTheDocument()
        expect(fileButton).toBeVisible()
        expect(editButton).toBeInTheDocument()
        expect(editButton).toBeVisible()
        expect(calculateButton).toBeInTheDocument()
        expect(calculateButton).toBeVisible()

        await user.click(fileButton)

        const tutorialDataMenuItem = screen.getByRole('menuitem', { name: /load tutorial data\.\.\./i })
        expect(tutorialDataMenuItem).toBeInTheDocument()
        expect(tutorialDataMenuItem).toBeVisible()

        await user.click(editButton)

        const mergeMoleculesMenuItem = screen.getByRole('menuitem', { name: /merge molecules\.\.\./i })
        expect(tutorialDataMenuItem).not.toBeInTheDocument()
        expect(mergeMoleculesMenuItem).toBeInTheDocument()
        expect(mergeMoleculesMenuItem).toBeVisible()

        await user.click(editButton)
        expect(mergeMoleculesMenuItem).not.toBeInTheDocument()

        await user.click(calculateButton)
        const superposeMenuItem = screen.getByRole('menuitem', { name: /superpose structures\.\.\./i })
        expect(superposeMenuItem).toBeInTheDocument()
        expect(superposeMenuItem).toBeVisible()

        const dummyButton = screen.getByText(/dummy button/i)
        await user.click(dummyButton)
        expect(superposeMenuItem).not.toBeInTheDocument()
    })
})
