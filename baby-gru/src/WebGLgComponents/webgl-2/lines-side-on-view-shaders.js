/*
 * The clip, fog and blur widget's side-on view (sideOnView.ts): LINES and NORMALLINES as plain
 * one-pixel GL lines, in each vertex's colour, unlit. Thick lines would cost the thick-line build
 * (linesToThickLines...) for a picture a few hundred pixels across.
 */
var lines_side_on_view_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec4 aVertexColour;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec4 vColor;

    void main(void) {
      gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
      vColor = aVertexColour;
    }
`;

var lines_side_on_view_fragment_shader_source = `#version 300 es\n
    precision mediump float;

    in lowp vec4 vColor;

    out vec4 fragColor;

    void main(void) {
      fragColor = vColor;
    }
`;

export {lines_side_on_view_vertex_shader_source, lines_side_on_view_fragment_shader_source};
