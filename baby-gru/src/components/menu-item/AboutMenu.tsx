import { useEffect, useState } from "react";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
import { webGPUAdapterSummary, webGPUUnavailableReason } from "../../WebGPUComponents/gpu";
import { moorhen } from "../../types/moorhen";
import { version } from "../../version";

export const About = () => {
    const [is64Bit, setIs64Bit] = useState<boolean>(false);
    const [adapter, setAdapter] = useState<string | null>(null);
    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance();

    // Who draws the main view as the menu opens, and why WebGL if it does.
    const mainView = moorhenInstance.webGPU.mainView();
    const renderer = mainView.drawing
        ? `Drawing in WebGPU${adapter ? ` (${adapter})` : ""}`
        : `Drawing in WebGL (${
              !mainView.requested ? "WebGPU is off in the preferences"
              : webGPUUnavailableReason() !== null ? "this browser does not offer WebGPU"
              : mainView.active ? mainView.webGLReason
              : "WebGPU could not start"
          })`;

    useEffect(() => {
        if (mainView.drawing) webGPUAdapterSummary().then(summary => setAdapter(summary.adapter));
    }, []);

    useEffect(() => {
        const getIs64bit = async () => {
            const is64bit = (await commandCentre.current.cootCommand(
                {
                    returnType: "boolean",
                    command: "is64bit",
                    commandArgs: [],
                },
                false
            )) as moorhen.WorkerResponse<boolean>;
            setIs64Bit(is64bit.data.result.result);
        };
        getIs64bit();
    }, []);

    return (
        <div style={{ width: "18rem" }}>
            <p>Moorhen is a molecular graphics program based on the Coot desktop program.</p>
            <p>Authors:</p>
            <ul>
                <li>Clément Dégut</li>
                <li>Filomeno Sanchez</li>
                <li>Paul Emsley</li>
                <li>Stuart McNicholas</li>
                <li>Martin Noble</li>
                <li>Lucrezia Catapano</li>
                <li>Paul Bond</li>
                <li>Jordan Dialpuri</li>
                <li>Jakub Smulski</li>
                <li>Shuai Wang</li>
                <li>Adam Simkin</li>
                <li>Toby King</li>
            </ul>
            <p>
                This is Moorhen v{version} ({is64Bit ? "64" : "32"}-bit)
            </p>
            <p>{renderer}</p>
            <p>
                <a href={`https://github.com/moorhen-coot/Moorhen`}>Source code</a>
            </p>
            {window.location.hostname==="moorhen.hosted.york.ac.uk" && <p>
                This version of Moorhen is hosted by the University of York. The following legal statements apply:<br/>
                <a href={`https://www.york.ac.uk/about/legal-statements/`} target="_blank">Legal statements</a>
            </p>}
        </div>
    );
};
