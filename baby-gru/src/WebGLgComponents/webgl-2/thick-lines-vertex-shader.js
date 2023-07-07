var thick_lines_vertex_shader_source = `#version 300 es\n
    in vec4 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;

    uniform mat4 uMVMatrix;
    uniform vec3 screenZ;
    uniform mat4 uPMatrix;
    uniform float pixelZoom;

    out lowp vec4 vColor;
    out lowp vec4 eyePos;


    void main(void) {

    float lineSize = pixelZoom*dot(aVertexNormal,aVertexNormal);
    vec3 lineY = lineSize * normalize(cross(aVertexNormal,screenZ));

    gl_Position =  uPMatrix * vec4(lineY+aVertexPosition.xyz,1.0);
    vColor = aVertexColour;

    eyePos = uMVMatrix * aVertexPosition;

    }
`;

export {thick_lines_vertex_shader_source};
