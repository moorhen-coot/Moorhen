var shadow_vertex_shader_source = `
#extension GL_OES_element_index : enable
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColour;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    varying lowp vec4 vColor;

    varying lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;

      eyePos = uMVMatrix * theVert;

    }
`;

export {shadow_vertex_shader_source};
