var thick_lines_normal_vertex_shader_source = `#version 300 es\n
    in vec4 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec3 aVertexRealNormal;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform vec3 screenZ;
    uniform mat4 uPMatrix;
    uniform float pixelZoom;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;
    out mediump mat4 mvInvMatrix;
    out lowp vec3 v;
    out lowp vec4 eyePos;

    void main(void) {

        vec4 theVert = aVertexPosition;
        float lineSize = pixelZoom*dot(aVertexNormal,aVertexNormal);
        vec3 lineY = lineSize * normalize(cross(aVertexNormal,screenZ));

        gl_Position =  uPMatrix * vec4(lineY+aVertexPosition.xyz,1.0);
        vColor = aVertexColour;
        vNormal = -aVertexRealNormal;
        if(dot(vNormal,screenZ)<0.0)
            vNormal = -vNormal;
        eyePos = uMVMatrix * aVertexPosition;
        mvInvMatrix = uMVINVMatrix;
        v = vec3(uMVMatrix * theVert);

    }
`;

export {thick_lines_normal_vertex_shader_source};
