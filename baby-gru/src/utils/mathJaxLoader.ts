import { loadScript } from "./windowCootCCP4Loader";

export const loadMathjax = async (src: string) => {
    if (window._mathJaxLoading) return;
    window._mathJaxLoading = true;

    if (window.MathJax) {
        delete window._mathJaxLoading;
        return;
    }

    try {
        await loadScript("https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js");
    } catch {
        console.debug(" Couldn't load mathjax via CDN, trying local mathjax if availaible");
        try {
            await loadScript(`${src}/mathjax/tex-svg.js`);
        } catch {
            console.warn(
                `Failed to load ${src}/mathjax/tex-svg.js enure file is present to be able to use mathjax functionality in Moorhen`
            );
            return;
        }
    }

    // Ensure the mathjaxout div exists
    let output = document.getElementById("mathjaxout");
    if (!output) {
        output = document.createElement("div");
        output.id = "mathjaxout";
        output.style.display = "none";
        document.body.appendChild(output);
    }

    const MathJax = window.MathJax;
    if (MathJax) {
        // This is a dummy render with MathJax which seems to be necessary to make sure that \color works
        // properly with loaded sessions.
        const input = String.raw`{\displaystyle \sum_{i}^{\infty} \Pi{\sqrt{\pi}\sqrt{\pi}}{\color{blue}Hello}}`;
        const output = document.getElementById("mathjaxout");
        if (output) {
            output.innerHTML = "";
            output.style.width = "0";
            output.style.height = "0";
            output.style.display = "none";
            let options = MathJax.getMetricsFor(output);
            options.display = false;
            const node = await MathJax.tex2svgPromise(input, options);
            if (node) {
                // Optionally, you can append the SVG to output if needed
                // const svg = node.getElementsByTagName("svg");
            }
        }
    }
    console.debug("MathJax Module Loaded");
    delete window._mathJaxLoading;
};
