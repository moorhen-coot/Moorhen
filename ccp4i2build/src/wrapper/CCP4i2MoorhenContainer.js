import { useCallback, useRef, useState } from 'react';
import { useEffect } from 'react';
import { MoorhenContainer } from '../components/MoorhenContainer';
import { MoorhenMolecule } from '../utils/MoorhenMolecule';
import { MoorhenMap } from '../utils/MoorhenMap';
import { PreferencesContextProvider } from '../utils/MoorhenPreferences';
import { NavDropdown } from 'react-bootstrap';
import { MenuItem } from '@mui/material';
import { MoorhenMoleculeSelect } from '../components/MoorhenMoleculeSelect';
import $ from 'jquery';

export const CCP4i2MoorhenContainer = (props) => {
    const controls = useRef(null);
    const [cootInitialized, setCootInitialized] = useState(false)
    const [cootJobId, setCootJobId] = useState(null)
    const urlRoot = 'http://127.0.0.1:43434/database'

    const makeDbFilePromise = (newFile, arg) => {
        const fileUrl = `${urlRoot}/getFileWithPredicate?${$.param({fileid:newFile.fileid})}`
        const mimeType = newFile.filetypeid__filetypename
        const annotation = newFile.annotation
        const subType = newFile.filesubtype
        return makeFilePromise(fileUrl, mimeType, annotation, subType, arg)
    }

    const makeParamsFilePromise = (fileOfType, mimeType, arg) =>{
        const fileDict = {}
        const projectNodes = $(fileOfType).find("project")
        if (projectNodes.length === 1 && $(projectNodes[0]).text().length > 0) {
            fileDict['projectId'] = $(projectNodes[0]).text()
        }
        const relPathNodes = $(fileOfType).find("relPath")
        if (relPathNodes.length === 1 && $(relPathNodes[0]).text().length > 0) {
            fileDict['relPath'] = $(relPathNodes[0]).text()
        }
        const baseNameNodes = $(fileOfType).find("baseName")
        if (baseNameNodes.length === 1 && $(baseNameNodes[0]).text().length > 0) {
            fileDict['baseName'] = $(baseNameNodes[0]).text()
        }
        let subType=1
        const subTypeNodes = $(fileOfType).find("subType")
        if (subTypeNodes.length === 1 && $(subTypeNodes[0]).text().length > 0) {
            subType = $(subTypeNodes[0]).text()
        }
        let annotation = "A file"
        const annotationNodes = $(fileOfType).find("annotation")
        if (annotationNodes.length === 1 && $(annotationNodes[0]).text().length > 0) {
            annotation = $(annotationNodes[0]).text()
        }
        const fileUrl = `${urlRoot}/getProjectFileData?${$.param(fileDict)}`
        console.log({fileUrl, mimeType, annotation, subType, arg})
        return makeFilePromise(fileUrl, mimeType, annotation, subType, arg)
    }

    const makeFilePromise = (fileUrl, mimeType, annotation, subType, arg) => {
        if (mimeType === 'application/refmac-dictionary') {
            return fetch(fileUrl)
                .then(response => response.text())
                .then(async fileContent => {
                    if (fileContent.trim().length > 0) {
                        //Associate with molNos if provide in arg, or place in general dictionary
                        const molNos = arg.molNos && arg.molNos.length > 0 ? arg.molNos : [-999999]
                        const readDictPromises = molNos.map(molNo => controls.current.commandCentre.current.cootCommand({
                            returnType: "status",
                            command: 'shim_read_dictionary',
                            commandArgs: [fileContent, molNo]
                        }, true))
                        return Promise.all(readDictPromises)
                            .then(async readReturns => {
                                controls.current.molecules
                                    .filter(molecule => molNos.includes(molecule.molNo) || molNos[0] === -999999)
                                    .forEach(async molecule => {
                                        molecule.setAtomsDirty(true)
                                        await molecule.redraw(controls.current.glRef)
                                    })
                                return Promise.resolve(true)
                            })
                    }
                    else {
                        return Promise.resolve(true)
                    }
                })
        }
        else if (mimeType === 'chemical/x-pdb') {
            const newMolecule = new MoorhenMolecule(controls.current.commandCentre)
            return newMolecule.loadToCootFromURL(fileUrl, annotation)
                .then(async reply => {
                    controls.current.changeMolecules({ action: "Add", item: reply })
                    newMolecule.centreOn(controls.current.glRef)
                    await reply.fetchIfDirtyAndDraw('CBs', controls.current.glRef)
                    return Promise.resolve(newMolecule.molNo)
                })
        }
        else if (mimeType === 'application/CCP4-mtz-map') {
            const newMap = new MoorhenMap(controls.current.commandCentre)
            const selectedColumns = {
                F: 'F', PHI: 'PHI', W: "", useWeight: false,
                isDifference: [2, 3, 4].includes(subType)
            }
            return newMap.loadToCootFromMtzURL(fileUrl,
                annotation,
                selectedColumns
            )
                .then(reply => {
                    if (subType == 1) {
                        controls.current.setActiveMap(reply)
                    }
                    controls.current.changeMaps({ action: "Add", item: reply })
                    return Promise.resolve(reply)
                })
        }
    }

    const handleCootJob = () => {
        const arg = { molNos: [] }
        fetch(`${urlRoot}/getJobFile?jobId=${props.cootJob}&fileName=input_params.xml`)
            .then(response => response.text())
            .then(text => { console.log(text); return Promise.resolve($.parseXML(text)) })
            .then(xmlStruct => {
                const inputData = $(xmlStruct).find("inputData")
                const filesOfType = inputData.find("CPdbDataFile")
                let readFilePromises = []
                filesOfType.toArray().forEach(fileOfType => {
                    const dbFileIdNodes = $(fileOfType).find("dbFileId")
                    const projectNodes = $(fileOfType).find("project")
                    if (dbFileIdNodes.length === 1 && $(dbFileIdNodes[0]).text().length > 0) {
                        const fileId = $(dbFileIdNodes[0]).text()
                        readFilePromises.push(makeDbFilePromise({
                            filetypeid__filetypename: "chemical/x-pdb",
                            fileid: fileId
                        }))
                    }
                    else if (projectNodes.length === 1 && $(projectNodes[0]).text().length > 0) {
                        readFilePromises.push(makeParamsFilePromise(fileOfType, "chemical/x-pdb"))
                    }
                })
                return Promise.all(readFilePromises)
                    .then(readMolNos => {
                        readMolNos.forEach(molNo => { arg.molNos.push(molNo) })
                        return Promise.resolve(true)
                    })
                    .then(() => {
                        const filesOfType = inputData.find("CMapCoeffsDataFile")
                        let readFilePromises = []
                        filesOfType.toArray().forEach((fileOfType, iItem) => {
                            const dbFileIdNodes = $(fileOfType).find("dbFileId")
                            const projectNodes = $(fileOfType).find("project")
                            if (dbFileIdNodes.length === 1 && $(dbFileIdNodes[0]).text().length > 0) {
                                const fileDict = {
                                    filetypeid__filetypename: "application/CCP4-mtz-map",
                                    fileid: $(dbFileIdNodes[0]).text()
                                }
                                const subTypeNodes = $(fileOfType).find("subType")
                                if (subTypeNodes.length === 1 && $(subTypeNodes[0]).text().length > 0) {
                                    fileDict['filesubtype'] = parseInt($(subTypeNodes[0]).text())
                                }
                                const anotationNodes = $(fileOfType).find("annotation")
                                if (anotationNodes.length === 1 && $(anotationNodes[0]).text().length > 0) {
                                    fileDict['annotation'] = $(anotationNodes[0]).text()
                                }
                                readFilePromises.push(makeDbFilePromise(fileDict))
                            }
                        })
                        return Promise.all(readFilePromises)
                    })
            })

    }

    useEffect(() => {
        if (cootInitialized) {
            if (props.cootJob) {
                handleCootJob()
            }
        }
    }, [cootInitialized])

    return <MoorhenContainer
        forwardControls={(returnedControls) => {
            controls.current = returnedControls
            console.log(controls.current)
            setCootInitialized(true)
        }}
        extraMenus={[<MoorhenCCP4i2Menu
            dropdownId={7}
            {...controls.current}
            handleJob={(jobId) => { /*handleJob(jobId)*/ }}
            cootJobId={props.cootJob}
            urlRoot={urlRoot}
        />]}
        controls={controls}
        lookup={props.lookup}
        urlPrefix=""
    />
}

CCP4i2MoorhenContainer.defaultProps = { job: { jobid: null }, cootJob: null }

const MoorhenCCP4i2Menu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    useEffect(() => {
        console.log('menuProps', props)
    }, [])

    useEffect(() => {
        console.log('menuProps.currentDr', props.currentDropdownId)
    }, [props.currentDropdownId])
    return <NavDropdown
        title="CCP4i2"
        id="ccp4i2-nav-dropdown"
        autoClose={popoverIsShown ? false : 'outside'}
        show={showMenu}
        style={{ display: 'flex', alignItems: 'center' }}
        onToggle={() => {
            console.log('onToggle')
            if (props.dropdownId !== props.currentDropdownId) {
                console.log('setting currentDropdownId', props.dropdownId)
                props.setCurrentDropdownId(props.dropdownId)
                setShowMenu(true)
            }
            else {
                props.setCurrentDropdownId(-1)
                setShowMenu(false)
            }
        }}>
        <MenuItem onClick={() => {
            fetch(`${props.urlRoot}/makeTerminateFile?jobId=${props.cootJobId}`)
                .then(response => response.json())
                .then(result => {
                    if (result.status === "Success") {
                        window.location.href="about:blank"
                    }
                })
        }}>End job</MenuItem>
    </NavDropdown>
}

