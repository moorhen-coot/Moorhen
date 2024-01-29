import { moorhen } from "../../types/moorhen";
import { useSelector } from 'react-redux';
import {Card, Col, Row } from "react-bootstrap";
import {useCallback, useEffect, useState} from "react";
import { guid } from "../../utils/MoorhenUtils";
import {privateer} from "../../types/privateer";

export const MoorhenCarbohydrateCard = (props: {
    carbohydrate: privateer.ResultsEntry;
    molecule: moorhen.Molecule;
}) => {

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    let globalUseList;
    const { carbohydrate, molecule } = props

    const handleClick = useCallback(async (e) => {
        const newCenterString =
            e.target.dataset.chainid +
            '/' +
            e.target.dataset.seqnum +
            '(' +
            e.target.dataset.resname +
            ')';

        if (molecule !== null) {
            await molecule.centreOn(newCenterString);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (globalUseList === null) {return}
            for (let i = 0; i < globalUseList.length; i++) {
                globalUseList[i].removeEventListener('click', handleClick);
                globalUseList[i].removeEventListener('mousedown', (e) => {e.stopPropagation();});
                globalUseList[i].removeEventListener('touchstart', (e) => {e.stopPropagation();});
            }
        }
    }, []);

    const sugarRef = useCallback(
        (node: HTMLElement | null) => {
            if (node !== null) {
                node.querySelector('svg').style.display = 'block';
                node.querySelector('svg').style.margin = 'auto';

                const useList = node.querySelectorAll('use');
                globalUseList = useList
                for (let i = 0; i < useList.length; i++) {
                    useList[i].addEventListener('click', handleClick);
                    useList[i].addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                    }, {passive: true});
                    useList[i].addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                    }, {passive: true});
                }
            }
        }, []
    );


    // For some reason a random key needs to be used here otherwise the scroll of the card list gets reset with every re-render
    return <Card key={guid()} style={{marginTop: '0.5rem'}}>
            <Card.Body style={{padding:'0.5rem'}}>
                <Row style={{display:'flex', justifyContent:'between'}}>
                    <Col style={{alignItems:'center', justifyContent:'center', display:'flex'}}>
                        <div style={{display: "flex", flexDirection: "column", width: width}}>
                            <h4>ID: {carbohydrate.id}</h4>
                            <div
                            style={{display: "flex", padding: "1rem"}}
                                id="svgContainer"
                                dangerouslySetInnerHTML={{
                                __html: carbohydrate.svg,
                            }}
                            ref={sugarRef}
                            />
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
}

