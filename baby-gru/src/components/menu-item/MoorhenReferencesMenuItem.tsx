import { CSSProperties } from "react";
import { version } from '../../version'
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenReferencesMenuItem = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {

    const divStyle : CSSProperties = {
      overflowY: 'scroll',
      overflowX: 'scroll',
      height:'500px',
    };
    
    const panelContent = <div style={divStyle}>
        <p>The following have been used to create Moorhen:</p>
<ul>
<li>Emscripten<ul>
<li><a href="https://emscripten.org/">https://emscripten.org/</a></li>
<li><a href="https://github.com/emscripten-core/emscripten/blob/main/docs/paper.pdf">Emscripten: An LLVM-to-JavaScript Compiler</a></li>
</ul>
</li>
<li>Coot<ul>
<li>P. Emsley; B. Lohkamp; W.G. Scott; Cowtan (2010). <em>Features and Development of Coot</em>, Acta Crystallographica. <strong>D66 (4)</strong> p486–501.</li>
</ul>
</li>
<li>Privateer<ul>
<li>Agirre, J., Iglesias-Fernández, J., Rovira, C., Davies, G.J., Wilson, K.S. and Cowtan, K.D., (2015), <em>Privateer: software for the conformational validation of carbohydrate structures</em>, Nature Structural and Molecular Biology <strong>22(11)</strong>, p.833.</li>
<li>Bagdonas, H., Ungar, D. and Agirre, J., (2020), <em>Leveraging glycomics data in glycoprotein 3D structure validation with Privateer</em>, Beilstein Journal of Organic Chemistry, <strong>16(1)</strong>, p2523-2533.</li>
</ul>
</li>
<li>Clipper<ul>
<li>Cowtan K (2003), <em>The Clipper C++ libraries for X‐ray crystallography</em>, IUCr Comput Comm Newslett <strong>2</strong>, p4–9</li>
</ul>
</li>
<li>CCP4<ul>
<li>Winn MD, Ballard CC, Cowtan KD, Dodson EJ, Emsley P, Evans PR, Keegan RM, Krissinel EB, Leslie AGW, McCoy A, McNicholas SJ, Murshudov GN, Pannu NS, Potterton EA, Powell HR, Read RJ, Vagin A, Wilson KS (2011), <em>Overview of the CCP4 suite and current developments</em>, Acta Cryst <strong>D67</strong>, p235–242. </li>
</ul>
</li>
<li>Gemmi<ul>
<li><a href="https://github.com/project-gemmi/gemmi">https://github.com/project-gemmi/gemmi</a></li>
</ul>
</li>
<li>Gesamt<ul>
<li>Krissinel E. (2012), <em>Enhanced fold recognition using efficient short fragment clustering</em>, Journal of molecular biochemistry, <strong>1(2)</strong>, p76–85.</li>
</ul>
</li>
<li>ProSMART<ul>
<li>R.A. Nicholls, M. Fischer, S. McNicholas and G.N. Murshudov (2014) <em>Conformation-Independent Structural Comparison of Macromolecules with ProSMART.</em> Acta Cryst. <strong>D70</strong>, p2487-2499.</li>
</ul>
</li>
<li>GSL<ul>
<li>M. Galassi et al, GNU Scientific Library Reference Manual (3rd Ed.), ISBN 0954612078</li>
<li>https://www.gnu.org/software/gsl/</li>
</ul>
</li>
<li>FFTW<ul>
<li>Frigo, Matteo and Johnson, Steven G. (2005), <em>The Design and Implementation of FFTW3</em>, Proceedings of the IEEE <strong>93(2)</strong>, p216-231.</li>
</ul>
</li>
<li>RDKit<ul>
<li>RDKit: Open-source cheminformatics <a href="https://www.rdkit.org">https://www.rdkit.org</a></li>
</ul>
</li>
<li>Boost<ul>
<li>Boost C++ libraries <a href="https://www.boost.org/users/license.html">https://www.boost.org/users/license.html</a></li>
</ul>
</li>
<li>GLM<ul>
<li>Open GL Mathematics <a href="https://github.com/g-truc/glm">https://github.com/g-truc/glm</a></li>
</ul>
</li>
<li>Eigen C++ Template Library<ul>
<li>Eigen: a c++ linear algebra library. <a href="http://www.association-aristote.fr/doku.php/public:seminaires:seminaire-2013-05-15">Libraries for scientific computing</a>. Ecole Polytechnique, May 15th, 2013</li>
</ul>
</li>
<li>Freetype<ul>
<li>FreeType is a freely available software library to render fonts. <a href="https://www.freetype.org">https://www.freetype.org</a></li>
</ul>
</li>
<li>Igraph<ul>
<li>Csardi G, Nepusz T (2006). <em>"The igraph software package for complex network research."</em> InterJournal, Complex Systems, 1695. <a href="https://igraph.org">https://igraph.org</a>.</li>
<li>Cs&aacute;rdi G, Nepusz T, Traag V, Horvát S, Zanini F, Noom D, Müller K (2024). <em>igraph: Network Analysis and Visualization in R.</em> <a href="https://doi.org/10.5281/zenodo.7682609">https://doi.org/10.5281/zenodo.7682609</a>, R package version 2.1.1, <a href="https://CRAN.R-project.org/package=igraph">https://CRAN.R-project.org/package=igraph</a> .</li>
</ul>
</li>
<li>JsonCPP<ul>
<li><a href="https://github.com/open-source-parsers/jsoncpp">https://github.com/open-source-parsers/jsoncpp</a></li>
</ul>
</li>
<li>Libpng<ul>
<li><a href="https://github.com/pnggroup/libpng">https://github.com/pnggroup/libpng</a></li>
</ul>
</li>
<li>libsigcplusplus<ul>
<li><a href="https://libsigcplusplus.github.io/libsigcplusplus/">https://libsigcplusplus.github.io/libsigcplusplus/</a></li>
</ul>
</li>
<li>Privateer<ul>
<li>The Web app: Dialpuri, J. S., Bagdonas, H., Schofield, L. C., Pham, P. T., Holland, L., Bond, P. S., Sánchez Rodríguez, F., McNicholas, S. J. &amp; Agirre, J. (2024). <em>Online carbohydrate 3D structure validation with the Privateer web app.</em> Acta Cryst. <strong>F80</strong>, 30-35.</li>
<li>General Privateer citation (old): Agirre, J., Iglesias-Fernández, J., Rovira, C., Davies, G.J., Wilson, K.S. and Cowtan, K.D., 2015. <em>Privateer: software for the conformational validation of carbohydrate structures.</em> Nature Structural and Molecular Biology, <strong>22(11)</strong>, p.833.</li>
<li>Glycomics powered validation: Bagdonas, H., Ungar, D. and Agirre, J., 2020. <em>Leveraging glycomics data in glycoprotein 3D structure validation with Privateer.</em> Beilstein Journal of Organic Chemistry, <strong>16(1)</strong>, 2523-2533.</li>
<li>Theory behind Privateer: Agirre, J., 2017. <em>Strategies for carbohydrate model building, refinement and validation.</em> Acta Crystallographica Section D, <strong>73(2)</strong>, pp.171-186.</li>
<li>Torsional analyses: Dialpuri, J. S., Bagdonas, H., Atanasova, M., Schofield, L. C., Hekkelman, M. L., Joosten, R. P. &amp; Agirre, J., 2023. <em>Analysis and validation of overall N-glycan conformation in Privateer.</em> Acta Crystallographica Section D, <strong>79</strong>, 462-472.</li>
</ul>
</li>
<li>Zlib<ul>
<li>Adler, Mark (22 January 2024). "<a href="https://madler.net/pipermail/zlib-announce_madler.net/2024/000015.html">Zlib-announce</a> zlib 1.3.1 released". Retrieved 23 January 2024.</li>
</ul>
</li>
<li>PubChem<ul>
<li>Kim S, Chen J, Cheng T, Gindulyte A, He J, He S, Li Q, Shoemaker BA, Thiessen PA, Yu B, Zaslavsky L, Zhang J, Bolton EE. PubChem 2023 update. Nucleic Acids Res. 2023 Jan 6;51(D1):D1373-D1380. <a href="https://doi.org/10.1093/nar/gkac956">https://doi.org/10.1093/nar/gkac956</a>. PMID: 36305812</li>
</ul>
</li>
<li>SMILES<ul>
<li>Weininger, David <em>SMILES, a chemical language and information system. 1. Introduction to methodology and encoding rules</em> ournal of Chemical Information and Computer Sciences <strong>28(1)</strong>, p31-36 (1988) <a href="https://doi.org/10.1021/ci00057a005">https://doi.org/10.1021/ci00057a005</a> </li>
</ul>
</li>
</ul>
    </div>

    return <MoorhenBaseMenuItem
        id='help-about-menu-item'
        popoverContent={panelContent}
        menuItemText="References..."
        onCompleted={() => { }}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
