var thick_lines_normal_gbuffer_vertex_shader_source = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColour;
    attribute vec3 aVertexNormal;
    attribute vec3 aVertexRealNormal;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform vec3 screenZ;
    uniform mat4 uPMatrix;
    uniform float pixelZoom;
    uniform mat4 TextureMatrix;

    varying lowp vec3 vNormal;
    varying lowp vec4 eyePos;
    varying lowp vec3 v;

    varying mediump mat4 mvInvMatrix;

    void main(void) {

        vec4 theVert = aVertexPosition;

        float lineSize = pixelZoom*dot(aVertexNormal,aVertexNormal);
        vec3 lineY = lineSize * normalize(cross(aVertexNormal,screenZ));

        mat3 rotMat;
        rotMat[0][0] = uMVMatrix[0][0];
        rotMat[0][1] = uMVMatrix[0][1];
        rotMat[0][2] = uMVMatrix[0][2];
        rotMat[1][0] = uMVMatrix[1][0];
        rotMat[1][1] = uMVMatrix[1][1];
        rotMat[1][2] = uMVMatrix[1][2];
        rotMat[2][0] = uMVMatrix[2][0];
        rotMat[2][1] = uMVMatrix[2][1];
        rotMat[2][2] = uMVMatrix[2][2];

        gl_Position =  uPMatrix * vec4(lineY+aVertexPosition.xyz,1.0);
        vNormal = (rotMat * aVertexRealNormal);
        if(dot(screenZ,aVertexRealNormal)>0.0)
           vNormal = aVertexRealNormal;
        eyePos = uMVMatrix * aVertexPosition;
        mvInvMatrix = uMVINVMatrix;
        v = gl_Position;

    }
`;

export {thick_lines_normal_gbuffer_vertex_shader_source};
