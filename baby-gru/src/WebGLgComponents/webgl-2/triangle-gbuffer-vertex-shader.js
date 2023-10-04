var triangle_gbuffer_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec3 aVertexColour;
    in vec3 aVertexNormal;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec3 vNormal;
    out lowp vec4 eyePos;
    out lowp vec4 v;

    out mediump mat4 mvInvMatrix;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition,1.0);

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

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vNormal = -(rotMat * aVertexNormal);
      eyePos = uMVMatrix * theVert;
      mvInvMatrix = uMVINVMatrix;
      v = gl_Position;

    }
`;

export {triangle_gbuffer_vertex_shader_source};
