import { useEffect, useState } from "react";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenSpinner } from "../icons";
import { MoorhenGrid } from "../interface-base/Stack/Grid";

export const MoorhenHeaderInfoCard = (props: { molecule: moorhen.Molecule }) => {
    const [title, setTitle] = useState<string | null>(null);
    const [compoundLines, setCompoundLines] = useState<string[]>([]);
    const [authorJournal, setAuthorJournal] = useState<libcootApi.AuthorJournal[]>([]);
    const [busy, setBusy] = useState<boolean>(true);

    useEffect(() => {
        const fetchHeaderInfo = async () => {
            const headerInfo = await props.molecule.fetchHeaderInfo(true);
            setTitle(headerInfo.title);
            setAuthorJournal(headerInfo.author_journal);
            setCompoundLines(headerInfo.compound_lines);
            setBusy(false);
            console.log(headerInfo.author_journal);
        };
        setBusy(true);
        fetchHeaderInfo();
    }, []);

    const auth_journal_stanza = authorJournal
        .sort((r1, r2) => {
            if (r1.id === "primary") {
                return -1;
            } else if (r2.id === "primary") {
                return 1;
            } else if (r1.id < r2.id) {
                return -1;
            } else {
                return 1;
            }
        })
        .map((item, idx) => {
            const auth = item.author;
            const journ = item.journal;

            const journal_stanza_this = journ.map((item, idx) => {
                if (item.startsWith("pdbx_database_id_DOI") && item.split(/(?<=^\S+)\s/).length > 1) {
                    const doi = "https://doi.org/" + item.split(/(?<=^\S+)\s/)[1].trim();
                    return (
                        <p style={{ margin: 0 }} key={idx}>
                            <a href={doi} target="_blank" rel="noopener noreferrer">
                                {item}
                            </a>
                        </p>
                    );
                } else if (item.startsWith("pdbx_database_id_PubMed") && item.split(/(?<=^\S+)\s/).length > 1) {
                    const doi = "https://pubmed.ncbi.nlm.nih.gov/" + item.split(/(?<=^\S+)\s/)[1].trim();
                    return (
                        <p style={{ margin: 0 }} key={idx}>
                            <a href={doi} target="_blank" rel="noopener noreferrer">
                                {item}
                            </a>
                        </p>
                    );
                } else {
                    return (
                        <p style={{ margin: 0 }} key={idx}>
                            {item}
                        </p>
                    );
                }
            });

            let row_style = { backgroundColor: "rgba(233, 233, 233, 0.3)" };
            if (idx % 2 == 0) row_style = { backgroundColor: "white" };
            return (
                <>
                        {journal_stanza_this}
                </>
            );
        });

    let last_row_style = { backgroundColor: "rgba(233, 233, 233, 0.3)" };
    if (authorJournal.length % 2 == 0) last_row_style = { backgroundColor: "white" };
    return (

        <MoorhenGrid columns={2} table >
            <div>Title</div>
            <div>{title}</div>
            <div>Authors</div>
            <div style={{textWrap: "balance"}}>{authorJournal.map(item => item.author).flat().join(", ")}</div>
            <div>Primary Citation</div> <div>{auth_journal_stanza}</div>
            <div>Compound</div>
            <div>
                {compoundLines.map((item, idx) => (
                    <p style={{ margin: 0 }} key={idx}>
                        {item}
                    </p>
                ))}
            </div>
            {/* </>
                        )} */}
        </MoorhenGrid>
    );
};
