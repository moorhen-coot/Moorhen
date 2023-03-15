import { useCallback, useRef, useState } from 'react';
import { useEffect } from 'react';
import { MoorhenContainer } from '../components/MoorhenContainer';
import { MoorhenMolecule } from '../utils/MoorhenMolecule';
import { MoorhenMap } from '../utils/MoorhenMap';
import { PreferencesContextProvider } from '../utils/MoorhenPreferences';
import { Modal, NavDropdown, Table } from 'react-bootstrap';
import { Button, MenuItem, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { MoorhenMoleculeSelect } from '../components/MoorhenMoleculeSelect';
import $ from 'jquery';
import { ArrowBack } from '@mui/icons-material';

export const CCP4i2MoorhenContainer = (props) => {
    const controls = useRef(null);
    const [cootInitialized, setCootInitialized] = useState(false)
    const urlRoot = 'http://127.0.0.1:43434/database'

    const makeDbFilePromise = (fileOfType, mimeType, arg) => {
        const fileDict = {
            filetypeid__filetypename: mimeType,
        }
        const dbFileIdNodes = $(fileOfType).find("dbFileId")
        if (dbFileIdNodes.length === 1 && $(dbFileIdNodes[0]).text().length > 0) {
            fileDict['fileid'] = $(dbFileIdNodes[0]).text()
        }
        const subTypeNodes = $(fileOfType).find("subType")
        if (subTypeNodes.length === 1 && $(subTypeNodes[0]).text().length > 0) {
            fileDict['filesubtype'] = parseInt($(subTypeNodes[0]).text())
        }
        const anotationNodes = $(fileOfType).find("annotation")
        if (anotationNodes.length === 1 && $(anotationNodes[0]).text().length > 0) {
            fileDict['annotation'] = $(anotationNodes[0]).text()
        }
        const fileUrl = `${urlRoot}/getFileWithPredicate?${$.param({ fileid: fileDict.fileid })}`
        const annotation = fileDict.annotation ? fileDict.annotation : "A file"
        const subType = fileDict.filesubtype ? fileDict.filesubtype : 1
        return makeFilePromise(fileUrl, mimeType, annotation, subType, arg)
    }

    const makeParamsFilePromise = (fileOfType, mimeType, arg) => {
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
        let subType = 1
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
        console.log({ fileUrl, mimeType, annotation, subType, arg })
        return makeFilePromise(fileUrl, mimeType, annotation, subType, arg)
    }

    const makeFilePromise = (fileUrl, mimeType, annotation, subType, arg) => {
        console.log('makeFilePromise', { fileUrl, mimeType, annotation, subType, arg })
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
                        readFilePromises.push(makeDbFilePromise(fileOfType, "chemical/x-pdb"))
                    }
                    else if (projectNodes.length === 1 && $(projectNodes[0]).text().length > 0) {
                        readFilePromises.push(makeParamsFilePromise(fileOfType, "chemical/x-pdb"))
                    }
                })
                return Promise.all(readFilePromises)
                    .then(readMolNos => {
                        readMolNos.forEach(molNo => { arg.molNos.push(molNo) })
                        const filesOfType = inputData.find("DICT")
                        let readFilePromises = []
                        filesOfType.toArray().forEach(fileOfType => {
                            const dbFileIdNodes = $(fileOfType).find("dbFileId")
                            const projectNodes = $(fileOfType).find("project")
                            if (dbFileIdNodes.length === 1 && $(dbFileIdNodes[0]).text().length > 0) {
                                readFilePromises.push(makeDbFilePromise(fileOfType, "application/refmac-dictionary", arg))
                            }
                            else if (projectNodes.length === 1 && $(projectNodes[0]).text().length > 0) {
                                readFilePromises.push(makeParamsFilePromise(fileOfType, "application/refmac-dictionary", arg))
                            }
                        })
                        return Promise.all(readFilePromises)
                    })
                    .then(() => {
                        const filesOfType = inputData.find("CMapCoeffsDataFile")
                        let readFilePromises = []
                        filesOfType.toArray().forEach(fileOfType => {
                            const dbFileIdNodes = $(fileOfType).find("dbFileId")
                            const projectNodes = $(fileOfType).find("project")
                            if (dbFileIdNodes.length === 1 && $(dbFileIdNodes[0]).text().length > 0) {
                                readFilePromises.push(makeDbFilePromise(fileOfType, "application/CCP4-mtz-map"))
                            }
                            else if (projectNodes.length === 1 && $(projectNodes[0]).text().length > 0) {
                                readFilePromises.push(makeParamsFilePromise(fileOfType, "application/CCP4-mtz-map"))
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
            key={"7"}
            dropdownId={7}
            {...controls.current}
            handleJob={(jobId) => { /*handleJob(jobId)*/ }}
            cootJobId={props.cootJob}
            controls={controls}
            urlRoot={urlRoot}
            makeFilePromise={makeFilePromise}
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
    const [iSave, setISave] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [showMoleculeSelectorModal, setShowMoleculeSelectorModal] = useState(false)
    const selectorRef = useRef(null)

    useEffect(() => {
        console.log('menuProps', props)
    }, [])

    useEffect(() => {
        console.log('menuProps.currentDr', props.currentDropdownId)
    }, [props.currentDropdownId])

    const saveMolNo = async (molNo) => {
        const formData = new FormData()
        formData.append('jobId', props.cootJobId)
        formData.append('fileRoot', `COOT_FILE_DROP/output_${iSave.toString().padStart(3, '0')}`)
        formData.append('fileExtension', ".pdb")
        const molZeros = props.controls.current.moleculesRef.current.filter(molecule => molecule.molNo === molNo)
        if (molZeros.length === 1) {
            console.log('molecules', props.controls.current)
            let response = await molZeros[0].getAtoms()
            const atomsBlob = new Blob([response.data.result.pdbData])
            formData.append('file', atomsBlob)
            fetch(`${props.urlRoot}/uploadFileToJob`, {
                method: "POST",
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    setISave(iSave + 1)
                    props.controls.current.setToastContent("File saved")
                })
        }
        else {
            props.controls.current.setToastContent(`No mols with index ${molNo}`)
        }
    }

    return <NavDropdown
        title="CCP4i2"
        id="ccp4i2-nav-dropdown"
        autoClose={popoverIsShown ? false : 'outside'}
        show={showMenu}
        style={{ display: 'flex', alignItems: 'center' }}
        onToggle={() => {
            console.log('onToggle')
            if (props.dropdownId !== props.currentDropdownId) {
                props.setCurrentDropdownId(props.dropdownId)
                setShowMenu(true)
            }
            else {
                props.setCurrentDropdownId(-1)
                setShowMenu(false)
            }
        }}>

        <MenuItem key="Find files" onClick={() => {
            setShowModal(true)
        }}>Add files
        </MenuItem>

        <MenuItem key="Save to CCP4i2" onClick={async () => {
            saveMolNo(0)
        }}>Save mol 0 to ccp4i2
        </MenuItem>

        <MenuItem key="Select molecule to save" onClick={() => {
            setShowMoleculeSelectorModal(true)
        }}>Select molecule to save
        </MenuItem>

        <MenuItem key="End session" onClick={() => {
            fetch(`${props.urlRoot}/makeTerminateFile?jobId=${props.cootJobId}`)
                .then(response => response.json())
                .then(result => {
                    if (result.status === "Success") {
                        window.location.href = "about:blank"
                    }
                })
        }}>End job
        </MenuItem>

        <Modal key="Data browser modal" show={showModal} onHide={() => {
            setShowModal(false)
        }}>
            <Modal.Body>
                <CCP4i2DataBrowser urlRoot={props.urlRoot} updated={showModal} makeFilePromise={props.makeFilePromise} />
            </Modal.Body>
        </Modal>

        <Modal key="Save selector modal" show={showMoleculeSelectorModal} onHide={() => {
            setShowMoleculeSelectorModal(false)
        }}><Modal.Body>
                {props.controls.current &&
                    <MoorhenMoleculeSelect ref={selectorRef} molecules={props.controls.current.moleculesRef.current} allowAny={false} />
                }
                <Button onClick={() => {
                    saveMolNo(parseInt(selectorRef.current.value))
                    setShowMoleculeSelectorModal(false)
                }}>OK</Button>
                <Button onClick={() => { setShowMoleculeSelectorModal(false) }}>Cancel</Button>
            </Modal.Body>
        </Modal>
    </NavDropdown>
}

const CCP4i2DataBrowser = (props) => {
    const [level, setLevel] = useState("Projects")
    const [project, setProject] = useState({})
    const [job, setJob] = useState({})
    const projectsPanel = <CCP4i2ProjectsPanel {...props} setProject={setProject} setLevel={setLevel} />
    const jobsPanel = <CCP4i2JobsPanel {...props} project={project} setLevel={setLevel} setJob={setJob} />
    const filesPanel = <CCP4i2FilesPanel {...props} job={job} setLevel={setLevel} />

    return level === "Projects" ? projectsPanel : level === "Jobs" ? jobsPanel : level === "Files" ? filesPanel : "No data"
}

const CCP4i2ProjectsPanel = (props) => {
    const [projects, setProjects] = useState([])
    useEffect(() => {
        if (props.updated) {
            fetch(`${props.urlRoot}/ModelValues?${$.param({
                __type__: "Projects"
            })}`)
                .then(response => response.json())
                .then(result => { setProjects(result.results) })
        }
    }, [props.updated])

    return projects.length > 0 ? <Table>
        <TableHead>
            <TableRow>
                <TableCell>Projects</TableCell>
            </TableRow>
        </TableHead>

        <TableBody> {projects.map(project => {
            return <TableRow key={project.projectid}>
                <TableCell
                    onClick={() => {
                        props.setLevel("Jobs")
                        props.setProject(project)
                    }}
                >{project.projectname}
                </TableCell>
            </TableRow>
        })}
        </TableBody>

    </Table> : <span>No data</span>
}

const CCP4i2JobsPanel = (props) => {
    const [jobs, setJobs] = useState([])
    useEffect(() => {
        if (props.project.projectid) {
            fetch(`${props.urlRoot}/ModelValues?${$.param({
                __type__: "Jobs",
                projectid__projectid: props.project.projectid,
                status__statustext: "Finished",
                parentjobid__isnull: true,
            })}`)
                .then(response => response.json())
                .then(result => {
                    setJobs(result.results.sort((a, b) => {
                        const aN = parseInt(a.jobnumber)
                        const bN = parseInt(b.jobnumber)
                        return aN < bN ? 1 : bN < aN ? -1 : 0
                    }))
                })

        }
    }, [props.project])
    return jobs.length > 0 ? <Table>
        <TableHead>
            <TableRow><Button onClick={() => { props.setLevel("Projects") }}><ArrowBack /></Button>
                Jobs of project {props.project.projectname}</TableRow>
        </TableHead>
        <TableBody>
            {jobs.map(job => <TableRow key={job.jobid}>
                <TableCell onClick={() => {
                    props.setJob(job)
                    props.setLevel("Files")
                }}><img
                        style={{ width: "2.0rem", height: "2.0rem", marginRight: "1rem" }}
                        title={job.taskname}
                        src={`${props.urlRoot}/svgicons/${job.taskname}`} alt={`${job.taskname} `} />
                    {job.jobnumber}: {job.jobtitle}
                </TableCell>
            </TableRow>)}
        </TableBody>
    </Table> :
        <span><Button onClick={() => { props.setLevel("Projects") }}><ArrowBack /></Button>No jobs in project {props.project.projectname}</span>
}

const CCP4i2FilesPanel = (props) => {
    const [files, setFiles] = useState([])
    const fileTypeMapping = {
        "application/CCP4-mtz-observed": "ObsDataFile",
        "application/CCP4-mtz-freerflag": "FreeRDataFile",
        "application/CCP4-mtz-map": "MapCoeffsDataFile",
        "application/CCP4-mtz-phases": "PhsDataFile",
        "application/refmac-dictionary": "DictDataFile",
        "application/coot-script": "CootHistoryDataFile",
        "application/CCP4-unmerged-experimental": "UnmergedDataFile",
        "chemical/x-pdb": "PdbDataFile",
        "application/CCP4-asu-content": "AsuDataFile"
    }
    useEffect(() => {
        if (props.job.jobid) {
            const predicate = {
                __type__: "Files",
                __values__: ["filetypeid__filetypename", "annotation", "fileid", "jobid__jobnumber", "filesubtype"],
                jobid__jobid: props.job.jobid,
                filetypeid__filetypename__in: ["application/CCP4-mtz-map", "application/refmac-dictionary", "chemical/x-pdb"]
            }
            console.log({ predicate })
            fetch(`${props.urlRoot}/ModelValues?${$.param(predicate)}`)
                .then(response => response.json())
                .then(result => {
                    setFiles(result.results)
                })
        }
    }, [props.job])
    return files.length > 0 ? <Table>
        <TableHead>
            <TableRow><Button onClick={() => { props.setLevel("Jobs") }}><ArrowBack /></Button>
                Files of job {props.job.jobnumber}</TableRow>
        </TableHead>
        <TableBody>
            {files.map(file => <TableRow key={file.fileid}>
                <TableCell onClick={() => {
                    const fileUrl = `${props.urlRoot}/getFileWithPredicate?fileid=${file.fileid}`
                    const mimeType = file.filetypeid__filetypename
                    const annotation = `${file.jobid__jobnumber} : ${file.annotation}`
                    const subType = file.filesubtype
                    props.makeFilePromise(fileUrl, mimeType, annotation, subType)
                }}><img
                        style={{ width: "2.0rem", height: "2.0rem", marginRight: "1rem" }}
                        title={file.filetypeid__filetypename}
                        src={`${props.urlRoot}/qticons/${fileTypeMapping[file.filetypeid__filetypename]}`} alt={`${fileTypeMapping[file.filetypeid__filetypename]} `} />
                    {file.jobid__jobnumber}: {file.annotation}
                </TableCell>
            </TableRow>)}
        </TableBody>
    </Table> :
        <span><Button onClick={() => { props.setLevel("Jobs") }}><ArrowBack /></Button>No files in job {props.job.jobnumber}</span>
}