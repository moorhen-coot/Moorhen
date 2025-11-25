import { ApolloClient, ApolloProvider, InMemoryCache, useLazyQuery } from "@apollo/client";
import { ArrowBackIosOutlined, ArrowForwardIosOutlined, FirstPageOutlined } from "@mui/icons-material";
import { Backdrop } from "@mui/material";
import { Store } from "@reduxjs/toolkit";
import { Button, Col, Form, FormSelect, Row, Spinner, Stack } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { gql } from "../../utils/__graphql__/gql";
import { GetPolimerInfoQueryVariables } from "../../utils/__graphql__/graphql";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenQueryHitCard } from "../card/MoorhenSequenceQueryHitCard";
import { MoorhenButton, MoorhenSlider } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";

const GET_POLYMER_INFO = gql(`
query GetPolimerInfo ($entryIds: [String!]! $entityIds: [String!]!) {
  entryInfo: entries(entry_ids: $entryIds) {
    entryId: rcsb_id
    info: rcsb_entry_info {
      resolution: resolution_combined
    }
    accessionInfo:  rcsb_accession_info {
      date: initial_release_date
    }
    compModelInfo: rcsb_comp_model_provenance {
      db: source_db
      url: source_url
    }
  }
  entityInfo: polymer_entities (entity_ids: $entityIds) {
    entityId: rcsb_id
    entityIds: rcsb_polymer_entity_container_identifiers {
      authId: auth_asym_ids
    }
  }
}`);

export const MoorhenQuerySequenceModal = () => {
    const client = useRef(
        new ApolloClient({
            uri: "https://data.rcsb.org/graphql",
            cache: new InMemoryCache(),
        })
    );

    return (
        <ApolloProvider client={client.current}>
            <MoorhenQuerySequence />
        </ApolloProvider>
    );
};

const MoorhenQuerySequence = () => {
    const [selectedModel, setSelectedModel] = useState<null | number>(null);
    const [selectedChain, setSelectedChain] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<string>("PDB");
    const [currentResultsPage, setCurrentResultsPage] = useState<number>(0);
    const [seqIdCutoff, setSeqIdCutoff] = useState<number>(90);
    const [eValCutoff, setEValCutoff] = useState<number>(0.1);
    const [busy, setBusy] = useState<boolean>(false);
    const [totalNumberOfHits, setTotalNumberOfHits] = useState<number>(0);

    const timerRef = useRef<any>(null);
    const cachedSeqIdCutoff = useRef<number | null>(null);
    const cachedEValCutoff = useRef<number | null>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement>(null);
    const chainSelectRef = useRef<HTMLSelectElement>(null);
    const sourceSelectRef = useRef<HTMLSelectElement>(null);

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);

    const [getPolimerInfo, { loading, error, data }] = useLazyQuery(GET_POLYMER_INFO);

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value));
        setSelectedChain(chainSelectRef.current.value);
    };

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedChain(evt.target.value);
    };

    const handleSourceChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setTotalNumberOfHits(0);
        setSelectedSource(evt.target.value);
    };

    const doPDBQuery = async (
        querySequence: string,
        start: number,
        seqIdCutoff: number = 0.9,
        eValCutoff: number = 0.1,
        resultsType: string = "experimental"
    ) => {
        if (!querySequence) {
            return;
        }

        const searchParams = {
            query: {
                type: "terminal",
                service: "sequence",
                parameters: {
                    evalue_cutoff: eValCutoff,
                    identity_cutoff: seqIdCutoff,
                    sequence_type: "protein",
                    value: querySequence,
                },
            },
            request_options: {
                results_content_type: [resultsType],
                scoring_strategy: "sequence",
                sort: [
                    {
                        sort_by: "score",
                        direction: "desc",
                    },
                ],
                paginate: {
                    start: start,
                    rows: 10,
                },
            },
            return_type: "polymer_entity",
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
            const reponse = await fetch(
                `https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(JSON.stringify(searchParams))}`,
                {
                    signal: controller.signal,
                }
            );
            const result = await reponse.json();
            return result;
        } catch (err) {
            console.log(err);
            console.warn("Unable to query PDB...");
        } finally {
            clearTimeout(timeoutId);
        }
    };

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null);
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo);
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo);
        }
    }, [molecules.length]);

    const queryOnlineServices = useCallback(
        async (seqId: number, eVal: number, resultsPageNumber: number = 0) => {
            if (seqId !== seqIdCutoff || eVal !== eValCutoff) {
                // User didn't finish moving the slider...
                return;
            } else if (!moleculeSelectRef.current.value || !chainSelectRef.current.value) {
                setTotalNumberOfHits(0);
                return;
            }

            setBusy(true);
            const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
            const sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value);
            let results: { result_set: { [id: number]: { identifier: string; score: number } }; total_count: number };

            results = await doPDBQuery(
                sequence.sequence.map(residue => residue.resCode).join(""),
                resultsPageNumber * 10,
                seqIdCutoff / 100,
                eValCutoff,
                sourceSelectRef.current.value === "PDB" ? "experimental" : "computational"
            );
            if (!results) {
                setTotalNumberOfHits(0);
                setBusy(false);
                return;
            }

            let queryInput: GetPolimerInfoQueryVariables;
            if (sourceSelectRef.current.value === "AFDB") {
                queryInput = {
                    entryIds: Object.keys(results.result_set).map(key =>
                        results.result_set[key].identifier.slice(0, results.result_set[key].identifier.length - 2)
                    ),
                    entityIds: Object.keys(results.result_set).map(key => results.result_set[key].identifier),
                };
            } else {
                queryInput = {
                    entryIds: Object.keys(results.result_set).map(key => results.result_set[key].identifier.slice(0, 4)),
                    entityIds: Object.keys(results.result_set).map(key => results.result_set[key].identifier),
                };
            }

            getPolimerInfo({ variables: queryInput });
            setCurrentResultsPage(resultsPageNumber);
            setTotalNumberOfHits(results.total_count);
            setBusy(false);
        },
        [seqIdCutoff, eValCutoff, molecules]
    );

    useEffect(() => {
        cachedSeqIdCutoff.current = seqIdCutoff;
        cachedEValCutoff.current = eValCutoff;
        timerRef.current = setTimeout(() => {
            queryOnlineServices(cachedSeqIdCutoff.current, cachedEValCutoff.current);
        }, 1000);
    }, [selectedModel, selectedChain, selectedSource, eValCutoff, seqIdCutoff]);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.SEQ_QUERY}
            left={width / 4}
            top={height / 4}
            minHeight={convertViewtoPx(15, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(50, height)}
            maxWidth={convertViewtoPx(50, width)}
            additionalChildren={
                <Backdrop sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer + 1 }} open={busy || loading}>
                    <Spinner animation="border" style={{ marginRight: "0.5rem" }} />
                    <span>Fetching...</span>
                </Backdrop>
            }
            headerTitle="Query using a sequence"
            body={
                <>
                    <Row style={{ padding: "0", margin: "0" }}>
                        <Col>
                            <MoorhenMoleculeSelect onChange={handleModelChange} ref={moleculeSelectRef} />
                        </Col>
                        <Col>
                            <MoorhenChainSelect
                                width=""
                                molecules={molecules}
                                onChange={handleChainChange}
                                selectedCoordMolNo={selectedModel}
                                ref={chainSelectRef}
                                allowedTypes={[1, 2]}
                            />
                        </Col>
                        <Col>
                            <Form.Group style={{ margin: "0.5rem" }}>
                                <Form.Label>Source</Form.Label>
                                <FormSelect size="sm" ref={sourceSelectRef} defaultValue={"PDB"} onChange={handleSourceChange}>
                                    <option value="PDB" key="PDB">
                                        PDB
                                    </option>
                                    <option value="AFDB" key="AFDB">
                                        Predicted Models
                                    </option>
                                </FormSelect>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col style={{ justifyContent: "center", alignContent: "center", alignItems: "center", display: "flex" }}>
                            <Form.Group controlId="eValueSlider" style={{ margin: "0.5rem", width: "100%" }}>
                                <MoorhenSlider
                                    minVal={0.1}
                                    maxVal={1.0}
                                    logScale={false}
                                    sliderTitle="E-Val cutoff"
                                    decimalPlaces={1}
                                    externalValue={eValCutoff}
                                    setExternalValue={value => setEValCutoff(value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col style={{ justifyContent: "center", alignContent: "center", alignItems: "center", display: "flex" }}>
                            <Form.Group controlId="seqIdSlider" style={{ margin: "0.5rem", width: "100%" }}>
                                <MoorhenSlider
                                    minVal={1}
                                    maxVal={100}
                                    logScale={false}
                                    sliderTitle="Seq. Id. cutoff"
                                    externalValue={seqIdCutoff}
                                    decimalPlaces={0}
                                    setExternalValue={value => setSeqIdCutoff(value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <hr></hr>
                    <Row>
                        {data ? (
                            <>
                                {totalNumberOfHits > 0 ? <span>Found {totalNumberOfHits} hits</span> : null}
                                {totalNumberOfHits > 0 ? (
                                    <div style={{ height: "100px", width: "100%" }}>
                                        {data &&
                                            data.entityInfo.map((entityInfo, idx) => {
                                                return (
                                                    <MoorhenQueryHitCard
                                                        key={entityInfo.entityId}
                                                        selectedMolNo={parseInt(moleculeSelectRef.current.value)}
                                                        selectedChain={chainSelectRef.current.value}
                                                        data={data}
                                                        idx={idx}
                                                    />
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <span>No results found...</span>
                                )}
                            </>
                        ) : null}
                    </Row>
                </>
            }
            footer={
                <>
                    <MoorhenStack gap={2} direction="horizontal" justify="flex-end">
                        {totalNumberOfHits > 0 ? (
                            <span>
                                Page {currentResultsPage + 1} of {Math.ceil(totalNumberOfHits / 10)}
                            </span>
                        ) : null}
                        <MoorhenButton
                            variant="primary"
                            onClick={() => queryOnlineServices(cachedSeqIdCutoff.current, cachedEValCutoff.current, 0)}
                        >
                            <FirstPageOutlined />
                        </MoorhenButton>
                        <MoorhenButton
                            variant="primary"
                            disabled={currentResultsPage === 0}
                            onClick={() => queryOnlineServices(cachedSeqIdCutoff.current, cachedEValCutoff.current, currentResultsPage - 1)}
                        >
                            <ArrowBackIosOutlined />
                        </MoorhenButton>
                        <MoorhenButton
                            variant="primary"
                            disabled={currentResultsPage === Math.ceil(totalNumberOfHits / 10) - 1}
                            onClick={() => queryOnlineServices(cachedSeqIdCutoff.current, cachedEValCutoff.current, currentResultsPage + 1)}
                        >
                            <ArrowForwardIosOutlined />
                        </MoorhenButton>
                    </MoorhenStack>
                </>
            }
        />
    );
};
