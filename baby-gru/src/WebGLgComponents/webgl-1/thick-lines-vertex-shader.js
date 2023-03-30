var thick_lines_vertex_shader_source = `
#extension GL_OES_element_index : enable
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColour;
    attribute vec3 aVertexNormal;

    uniform mat4 uMVMatrix;
    uniform vec3 screenZ;
    uniform mat4 uPMatrix;
    uniform float pixelZoom;

    varying lowp vec4 vColor;
    varying lowp vec4 eyePos;


    void main(void) {

    float lineSize = pixelZoom*dot(aVertexNormal,aVertexNormal);
    vec3 lineY = lineSize * normalize(cross(aVertexNormal,screenZ));

    gl_Position =  uPMatrix * vec4(lineY+aVertexPosition.xyz,1.0);
    vColor = aVertexColour;

    eyePos = uMVMatrix * aVertexPosition;

    }
`;

export {thick_lines_vertex_shader_source};
