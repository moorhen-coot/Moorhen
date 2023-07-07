var shadow_instanced_vertex_shader_source = `
#extension GL_OES_element_index : enable
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColour;
    attribute vec3 instancePosition;
    attribute vec3 instanceSize;
    attribute mat4 instanceOrientation;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    varying lowp vec4 vColor;

    varying lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(instancePosition,1.0)+instanceOrientation*vec4(instanceSize*aVertexPosition,1.0);
      theVert.a = 1.0;


      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;

      eyePos = uMVMatrix * theVert;

    }
`;

export {shadow_instanced_vertex_shader_source};

