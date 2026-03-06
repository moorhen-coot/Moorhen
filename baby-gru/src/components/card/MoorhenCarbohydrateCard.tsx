import { DownloadOutlined } from "@mui/icons-material";
import { useCallback } from "react";
import { moorhen } from "../../types/moorhen";
import { privateer } from "../../types/privateer";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const MoorhenCarbohydrateCard = (props: { carbohydrate: privateer.ResultsEntry; molecule: moorhen.Molecule }) => {
    const { carbohydrate, molecule } = props;

    const handleClick = useCallback(async e => {
        if (e.target.dataset?.chainid && e.target.dataset?.seqnum && e.target.dataset?.resname && molecule !== null) {
            const newCenterString = `${e.target.dataset.chainid}/${e.target.dataset.seqnum}(${e.target.dataset.resname})`;
            await molecule.centreOn(newCenterString, true, true);
        }
    }, []);

    // For some reason a random key needs to be used here otherwise the scroll of the card list gets reset with every re-render
    return (
        <MoorhenStack card>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <h4>ID: {carbohydrate.id}</h4>
                <div dangerouslySetInnerHTML={{ __html: carbohydrate.svg }} />
                <MoorhenStack direction="row">
                    <MoorhenButton icon="MatSymFilterFocus" onClick={handleClick}>
                        Show
                    </MoorhenButton>
                    <MoorhenButton
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
                </MoorhenStack>
            </div>
        </MoorhenStack>
    );
};
