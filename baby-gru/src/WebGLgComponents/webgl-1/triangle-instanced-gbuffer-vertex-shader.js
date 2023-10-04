var triangle_instanced_gbuffer_vertex_shader_source = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexColour;
    attribute vec3 aVertexNormal;
    attribute vec3 instancePosition;
    attribute vec3 instanceSize;
    attribute mat4 instanceOrientation;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    varying lowp vec3 vNormal;
    varying lowp vec4 eyePos;
    varying lowp vec4 v;

    varying mediump mat4 mvInvMatrix;

    void main(void) {

      vec4 theVert = vec4(instancePosition,1.0)+instanceOrientation*vec4(instanceSize*aVertexPosition,1.0);
      theVert.a = 1.0;

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
      vNormal = -rotMat * (instanceOrientation*vec4(aVertexNormal,1.0)).xyz;
      eyePos = uMVMatrix * theVert;
      mvInvMatrix = uMVINVMatrix;
      v = gl_Position;

    }
`;

export {triangle_instanced_gbuffer_vertex_shader_source};
