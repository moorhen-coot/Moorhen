import { Backdrop, Popover, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { libcootApi } from "../../types/libcoot";
import { convertViewtoPx } from "../../utils/utils";

export const MoorhenHeaderInfoCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean;
    anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
}) => {

    const [title, setTitle] = useState<string | null>(null)
    const [compoundLines, setCompoundLines] = useState<string[]>([])
    const [authorJournal, setAuthorJournal] = useState<libcootApi.AuthorJournal[]>([])
    const [busy, setBusy] = useState<boolean>(true)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    useEffect(() => {
        const fetchHeaderInfo = async () => {
            const headerInfo = await props.molecule.fetchHeaderInfo(true)
            setTitle(headerInfo.title)
            setAuthorJournal(headerInfo.author_journal)
            setCompoundLines(headerInfo.compound_lines)
            setBusy(false)
        }
        setBusy(true)
        fetchHeaderInfo()
    }, [])

    const auth_journal_stanza = authorJournal.sort((r1, r2) => {if(r1.id==="primary"){return -1} else if(r2.id==="primary"){return 1} else if(r1.id<r2.id){return -1}else{return 1}}).map((item, idx) => {
        const auth = item.author
        const journ = item.journal

        const journal_stanza_this = journ.map((item, idx) => {
            if(item.startsWith("pdbx_database_id_DOI")&&(item.split(/(?<=^\S+)\s/)).length>1){
                const doi = "https://doi.org/"+item.split(/(?<=^\S+)\s/)[1].trim()
                return <p style={{margin: 0}} key={idx}><a href={doi} target="_blank" rel="noopener noreferrer">{item}</a></p>
            } else if(item.startsWith("pdbx_database_id_PubMed")&&(item.split(/(?<=^\S+)\s/)).length>1){
                const doi = "https://pubmed.ncbi.nlm.nih.gov/"+item.split(/(?<=^\S+)\s/)[1].trim()
                return <p style={{margin: 0}} key={idx}><a href={doi} target="_blank" rel="noopener noreferrer">{item}</a></p>
            } else {
                return <p style={{margin: 0}} key={idx}>{item}</p>
            }
        })

       let row_style={backgroundColor: 'rgba(233, 233, 233, 0.3)'}
       if(idx%2==0)
             row_style = {backgroundColor: 'white'}
       return <TableRow key={idx} style={row_style} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell>
            Journal
            </TableCell>
            <TableCell>
            {auth.map((item, idx) => <span style={{margin: 0}} key={idx}>{item}</span>)}
            <br/><br/>{journal_stanza_this}
            </TableCell>
        </TableRow>
    })

    let last_row_style={backgroundColor: 'rgba(233, 233, 233, 0.3)'}
    if(authorJournal.length%2==0)
        last_row_style = {backgroundColor: 'white'}
    return <Popover
            onClose={() => props.setShow(false)}
            open={props.show}
            anchorEl={props.anchorEl.current}
            anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
            transformOrigin={{ vertical: 'center', horizontal: 'center', }}
            sx={{'& .MuiPaper-root': { backgroundColor: isDark ? 'grey' : 'white', marginTop: '0.1rem', borderRadius: '1rem', borderStyle: 'solid', borderColor: 'grey', borderWidth: '1px' }}}>
        <TableContainer style={{maxWidth: convertViewtoPx(40, width), maxHeight: convertViewtoPx(40, height), overflow: 'auto'}}>
            <Table stickyHeader={true}>
                <TableHead>
                    <TableRow>
                        <TableCell>Field</TableCell>
                        <TableCell>Value</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {title === null ?
                     <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                        <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                        <span>Loading...</span>
                    </Backdrop>
                    :
                    <>
                    <TableRow style={{backgroundColor: 'rgba(233, 233, 233, 0.3)'}} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell component="th" scope="row">Title</TableCell>
                        <TableCell component="th" scope="row">{title}</TableCell>
                    </TableRow>
                    {auth_journal_stanza}
                    <TableRow style={last_row_style} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell component="th" scope="row">Compound</TableCell>
                        <TableCell component="th" scope="row">{compoundLines.map((item, idx) => <p style={{margin: 0}} key={idx}>{item}</p>)}</TableCell>
                    </TableRow>
                    </>
                    }
                </TableBody>
            </Table>
        </TableContainer>
    </Popover>
}
