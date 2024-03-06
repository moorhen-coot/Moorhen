import '@testing-library/jest-dom'
import { render, screen, cleanup, act }  from '@testing-library/react'
import { MoorhenNavBar }  from '../../src/components/navbar-menus/MoorhenNavBar'
import { Provider } from 'react-redux'
import { userEvent } from '@testing-library/user-event'
import MoorhenStore from "../../src/store/MoorhenReduxStore"
import { createRef } from 'react'
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

describe('Testing MoorhenNavBar', () => {

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
        })
    })
    
    afterEach(cleanup)

    test('Test MoorhenNavBar render', async () => {
        render(
            <Provider store={MoorhenStore}> 
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
        const cryo = screen.getByRole('menuitem', { name: /cryo/i })
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
        expect(cryo).toBeInTheDocument()
        expect(cryo).toBeVisible()
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

    test('Test MoorhenNavBar render with extra menus', async () => {

        collectedProps.extraNavBarMenus = [{
            name: 'test',
            ref: createRef(null),
            JSXElement: <div>Test extra navBar menus</div>
        }]

        render(
            <Provider store={MoorhenStore}> 
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

    test('Test MoorhenNavBar render with specific menu items', async () => {

        collectedProps.includeNavBarMenuNames = ['History' , 'Ligand', 'File', 'Calculate']

        render(
            <Provider store={MoorhenStore}> 
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
        const cryo = screen.queryByRole('menuitem', { name: /cryo/i })
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
        expect(cryo).not.toBeInTheDocument()
        expect(models).not.toBeInTheDocument()
        expect(maps).not.toBeInTheDocument()
        expect(help).not.toBeInTheDocument()
        expect(preferences).not.toBeInTheDocument()

        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems.map(item => item.textContent)).toEqual(collectedProps.includeNavBarMenuNames)
    })
})