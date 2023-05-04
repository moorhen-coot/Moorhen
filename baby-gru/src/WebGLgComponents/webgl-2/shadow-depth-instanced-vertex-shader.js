var shadow_instanced_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 instancePosition;
    in vec3 instanceSize;
    in mat4 instanceOrientation;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    out lowp vec4 vColor;

    out lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(instancePosition,1.0)+instanceOrientation*vec4(instanceSize*aVertexPosition,1.0);
      theVert.a = 1.0;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;

      eyePos = uMVMatrix * theVert;

    }
`;

export {shadow_instanced_vertex_shader_source};

