export const getMathJaxSVG = async (input:string) => {
    // @ts-ignore
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
                    const rects = svg[0].getElementsByTagName("rect")
                    let svg_width = 200
                    let svg_height = 200
                    for(let irect=0;irect<rects.length;irect++){
                        try {
                            //I am *assuming* a MathJax node has an SVG containing a rect giving the dimensions
                            const dum1 = rects[irect].attributes["x"].nodeValue
                            const dum2 = rects[irect].attributes["y"].nodeValue
                            svg_width = rects[irect].attributes["width"].nodeValue
                            svg_height = rects[irect].attributes["height"].nodeValue
                        } catch(e) {
                        }
                    }
                    return {svg:svg[0].outerHTML,width:svg_width,height:svg_height}
                }
                mj.startup.document.clear();
                mj.startup.document.updateDocument();
            }
        } catch(err) {
            console.error("Failed to render with MathJax")
            console.error(err)
        }
    }
    return {svg:"",width:0,height:0}
}
