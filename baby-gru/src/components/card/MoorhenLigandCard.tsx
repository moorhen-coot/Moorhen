import {
    CenterFocusStrongOutlined,
    DownloadOutlined,
    ExpandMoreOutlined,
    HelpOutlined,
    RadioButtonCheckedOutlined,
    RadioButtonUncheckedOutlined,
} from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    LinearProgress,
    Popover,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import parse from "html-react-parser";
import { useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { LigandInfo } from "../../utils/MoorhenMolecule";
import { convertViewtoPx, guid } from "../../utils/utils";
import { MoorhenButton, MoorhenPopoverButton, MoorhenToggle } from "../inputs";
import { MoorhenAccordion, MoorhenStack } from "../interface-base";
import { MoorhenCopyToClipBoard } from "../misc/MoorhenCopyToClipBoard";

export const MoorhenLigandCard = (props: {
    ligand: LigandInfo;
    molecule: moorhen.Molecule;
    validationStyles?: moorhen.RepresentationStyles[];
    calculateQScore?: boolean;
}) => {
    const validationLabels = {
        chemical_features: "Chem. Features",
        ligand_environment: "Env. Distance",
        contact_dots: "Contact dots",
        ligand_validation: "Geom. Validation",
    };

    const anchorEl = useRef(null);

    const [showState, setShowState] = useState<{ [key: string]: boolean }>({});
    const [showInfoTable, setShowInfoTable] = useState<boolean>(false);
    const [qScore, setQScore] = useState<number | null>(null);
    const [flevAccordianExpanded, setFlevAccordianExpanded] = useState<boolean>(false);

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);

    const defaultValidationStyles: moorhen.RepresentationStyles[] = [
        "contact_dots",
        "chemical_features",
        "ligand_environment",
        "ligand_validation",
    ];

    const { ligand, molecule, validationStyles, calculateQScore } = {
        validationStyles: defaultValidationStyles,
        calculateQScore: false,
        ...props,
    };

    useEffect(() => {
        const changedState = { ...showState };
        validationStyles.forEach(
            style =>
                (changedState[style] = molecule.representations.some(
                    representation => representation.style === style && representation.visible
                ))
        );
        setShowState(changedState);
        return () => {
            validationStyles.forEach(key => {
                molecule.hide(key, ligand.cid);
            });
        };
    }, []);

    useEffect(() => {
        const getQScore = async () => {
            if (activeMap && calculateQScore) {
                const qScoreResponse = await molecule.calculateQscore(activeMap, ligand.cid);
                setQScore(qScoreResponse?.[0]?.value);
            }
        };
        getQScore();
    }, []);

    const getToggleButton = (style: moorhen.RepresentationStyles, label: string) => {
        return (
            <MoorhenButton
                key={`${style}-${molecule.molNo}-${ligand.cid}`}
                checked={showState[style]}
                type="toggle"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                    if (showState[style]) {
                        molecule.hide(style, ligand.cid);
                        const changedState = { ...showState };
                        changedState[style] = false;
                        setShowState(changedState);
                    } else {
                        molecule.show(style, ligand.cid);
                        const changedState = { ...showState };
                        changedState[style] = true;
                        setShowState(changedState);
                    }
                }}
                label={label}
                icon={showState[style] ? "MatSymRadioButtonChecked" : "MatSymRadioButtonUnchecked"}
            ></MoorhenButton>
        );
    };

    let flev_placeholder = true;
    if (ligand && ligand.flev_svg) flev_placeholder = ligand.flev_svg.includes("You must add hydrogen atoms to the model");

    // For some reason a random key needs to be used here otherwise the scroll of the card list gets reset with every re-render
    return (
        <MoorhenStack card>
            {ligand.chem_comp_info?.length > 0 && (
                <Popover
                    anchorOrigin={{ vertical: "center", horizontal: "center" }}
                    transformOrigin={{ vertical: "center", horizontal: "center" }}
                    open={showInfoTable}
                    onClose={() => setShowInfoTable(false)}
                    anchorEl={{
                        nodeType: 1,
                        getBoundingClientRect: () => anchorEl.current.getBoundingClientRect(),
                    }}
                    sx={{
                        "& .MuiPaper-root": {
                            overflowY: "hidden",
                            borderRadius: "8px",
                            padding: "0.5rem",
                            background: isDark ? "grey" : "white",
                        },
                    }}
                >
                    <TableContainer
                        style={{
                            maxWidth: convertViewtoPx(40, width),
                            maxHeight: convertViewtoPx(40, height),
                            overflow: "auto",
                        }}
                    >
                        <Table stickyHeader={true}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Field</TableCell>
                                    <TableCell>Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ligand.chem_comp_info.map((chemInfo, idx) => (
                                    <TableRow
                                        style={{
                                            backgroundColor: idx % 2 !== 0 ? "white" : "rgba(233, 233, 233, 0.3)",
                                        }}
                                        key={`${chemInfo.first} - ${chemInfo.second}`}
                                        sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                                    >
                                        <TableCell component="th" scope="row">
                                            {chemInfo.first}
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            {chemInfo.second}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Popover>
            )}
            <MoorhenStack direction="vertical" gap={1}>
                {ligand.svg ? parse(ligand.svg) : <span>{ligand.cid}</span>}
                {calculateQScore && activeMap ? (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        {qScore ? (
                            <span>Q-Score: {qScore.toFixed(2)}</span>
                        ) : (
                            <LinearProgress variant="indeterminate" style={{ width: "50%" }} />
                        )}
                    </div>
                ) : null}
            </MoorhenStack>
            <MoorhenStack>
                <MoorhenStack direction="row">
                    <MoorhenButton
                        variant="primary"
                        onClick={() => {
                            molecule.centreOn(ligand.cid, true, true);
                        }}
                        icon="MatSymFilterFocus"
                        tooltip={ligand.cid}
                    >
                        Show
                    </MoorhenButton>
                    {!flev_placeholder && (
                        <MoorhenButton
                            onClick={() => {
                                let link: any = document.getElementById("download_flev_svg_link");
                                if (!link) {
                                    link = document.createElement("a");
                                    link.id = "download_flev_svg_link";
                                    document.body.appendChild(link);
                                }
                                const file = new Blob([ligand.flev_svg], {
                                    type: "image/svg+xml",
                                });
                                link.href = URL.createObjectURL(file);
                                link.download = ligand.resName + "_flev.svg";
                                link.click();
                            }}
                        >
                            <DownloadOutlined />
                            Download image (svg)
                        </MoorhenButton>
                    )}
                </MoorhenStack>
                <MoorhenStack inputGrid>
                    {validationStyles.map(style => {
                        return getToggleButton(style, validationLabels[style]);
                    })}
                </MoorhenStack>
                {ligand.chem_comp_info?.length > 0 && (
                    <MoorhenButton variant="secondary" onClick={() => setShowInfoTable(prev => !prev)}>
                        <HelpOutlined style={{ marginRight: "0.5rem" }} />
                        Show info
                    </MoorhenButton>
                )}
            </MoorhenStack>

            {ligand.smiles && (
                <MoorhenStack
                    card
                    style={{
                        textWrap: "nowrap",
                        display: "block",
                        width: "auto",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                    }}
                >
                    {ligand.smiles}
                    &nbsp;&nbsp;
                    <MoorhenCopyToClipBoard text={ligand.smiles} tooltip="Copy SMILES to clipboard" />
                </MoorhenStack>
            )}
            {ligand.smiles &&
                ligand.flev_svg &&
                (ligand.flev_svg.includes("<!-- Substitution Contour -->") ||
                    ligand.flev_svg.includes("<!-- Solvent Accessibilty of Atom -->") ||
                    ligand.flev_svg.includes("<!-- Exposure Circle -->") ||
                    ligand.flev_svg.includes("<!-- Residue Circle")) && (
                    <MoorhenPopoverButton
                        type="default"
                        label="Show 2D Environement view"
                        popoverStyle={{ width: "40rem" }}
                        popoverPlacement="left"
                        closeButton
                    >
                        {parse(ligand.flev_svg)}
                    </MoorhenPopoverButton>
                )}
        </MoorhenStack>
    );
};
