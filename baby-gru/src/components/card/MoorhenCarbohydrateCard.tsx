import { DownloadOutlined } from "@mui/icons-material";
import { Button, Card, Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback } from "react";
import { moorhen } from "../../types/moorhen";
import { privateer } from "../../types/privateer";
import { guid } from "../../utils/utils";
import { MoorhenButton } from "../inputs";

export const MoorhenCarbohydrateCard = (props: { carbohydrate: privateer.ResultsEntry; molecule: moorhen.Molecule }) => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);

    const { carbohydrate, molecule } = props;

    const handleClick = useCallback(async e => {
        if (e.target.dataset?.chainid && e.target.dataset?.seqnum && e.target.dataset?.resname && molecule !== null) {
            const newCenterString = `${e.target.dataset.chainid}/${e.target.dataset.seqnum}(${e.target.dataset.resname})`;
            await molecule.centreOn(newCenterString, true, true);
        }
    }, []);

    // For some reason a random key needs to be used here otherwise the scroll of the card list gets reset with every re-render
    return (
        <Card key={guid()} style={{ marginTop: "0.5rem" }}>
            <Card.Body style={{ padding: "0.5rem" }}>
                <Row style={{ display: "flex", justifyContent: "between" }}>
                    <Col style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
                        <div style={{ display: "flex", flexDirection: "column", width: width }}>
                            <h4>ID: {carbohydrate.id}</h4>
                            <div
                                onClick={handleClick}
                                style={{ display: "flex", padding: "1rem" }}
                                id="svgContainer"
                                dangerouslySetInnerHTML={{
                                    __html: carbohydrate.svg,
                                }}
                            />
                            <MoorhenButton
                                variant="secondary"
                                style={{ width: "25%", marginRight: "0.5rem", display: "flex", justifyContent: "left" }}
                                onClick={() => {
                                    let link: any = document.getElementById("download_svg_link");
                                    if (!link) {
                                        link = document.createElement("a");
                                        link.id = "download_svg_link";
                                        document.body.appendChild(link);
                                    }
                                    //I think this is a bug in the privateer SVG (perhaps)
                                    const file = new Blob([carbohydrate.svg.replace("width=100%", 'width="100%"')], {
                                        type: "image/svg+xml",
                                    });
                                    link.href = URL.createObjectURL(file);
                                    console.log(carbohydrate);
                                    link.download = carbohydrate.id.replace(/\//g, "_") + ".svg";
                                    link.click();
                                }}
                            >
                                <DownloadOutlined />
                                Download image (svg)
                            </MoorhenButton>
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};
