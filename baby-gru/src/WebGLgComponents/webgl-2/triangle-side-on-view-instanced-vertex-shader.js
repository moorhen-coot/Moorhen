const triangle_side_on_view_instanced_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec3 instancePosition;
    in vec3 instanceSize;
    in mat4 instanceOrientation;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;

    out lowp vec4 eyePos;

    out lowp mat3 mvMatrix;

    void main(void) {

      //vec4 theVert = vec4(instancePosition,1.0)+instanceOrientation*vec4((instanceSize)*aVertexPosition,1.0);
      vec4 theVert = vec4(instancePosition,1.0)+vec4((instanceSize)*aVertexPosition,1.0);
      theVert.a = 1.0;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      //vNormal = (instanceOrientation*vec4(aVertexNormal,1.0)).xyz;
      vNormal = (vec4(aVertexNormal,1.0)).xyz;
      eyePos = uMVMatrix * theVert;

      mvMatrix[0][0] = uMVMatrix[0][0];
      mvMatrix[0][1] = uMVMatrix[0][1];
      mvMatrix[0][2] = uMVMatrix[0][2];
      mvMatrix[1][0] = uMVMatrix[1][0];
      mvMatrix[1][1] = uMVMatrix[1][1];
      mvMatrix[1][2] = uMVMatrix[1][2];
      mvMatrix[2][0] = uMVMatrix[2][0];
      mvMatrix[2][1] = uMVMatrix[2][1];
      mvMatrix[2][2] = uMVMatrix[2][2];
    }
`;

export {triangle_side_on_view_instanced_vertex_shader_source};
