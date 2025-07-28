export const getMathJaxSVG = async (input:string) => {
    const mj = window.MathJax
    if(mj){
        const output = document.getElementById('mathjaxout');
        output.innerHTML = '';
        output.style.width = "0"
        output.style.height = "0"
        output.style.display = "none"
        let options = mj.getMetricsFor(output);
        options.display = false

        try {
            const node = await mj.tex2svgPromise(input, options)
            if(node) {
                const svg = node.getElementsByTagName("svg")
                if(svg.length>0){
                    const rects = svg
                    let whratio = -1
                    try {
                            //I am *assuming* a MathJax node is an SVG containing the dimensions
                            const svg_width = parseInt(svg[0].attributes["width"].nodeValue)
                            const svg_height = parseInt(svg[0].attributes["height"].nodeValue)
                            whratio = svg_width/svg_height
                    } catch(e) {
                        whratio = -1
                    }
                    return {svg:svg[0].outerHTML,whratio:whratio}
                }
                mj.startup.document.clear();
                mj.startup.document.updateDocument();
            }
        } catch(err) {
            console.error("Failed to render with MathJax")
            console.error(err)
        }
    }
    return {svg:"",whratio:-1}
}
