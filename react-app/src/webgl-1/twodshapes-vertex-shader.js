var twod_vertex_shader_source = `
#extension GL_OES_element_index : enable
    // This shader is basic
    attribute vec3 aVertexOrigin;
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColour;
    attribute vec3 aVertexNormal;
    attribute vec2 aVertexTexture;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    varying lowp vec4 vColor;
    varying lowp vec3 vNormal;
    varying lowp vec2 vTexture;
    varying mediump mat4 mvMatrix;
    varying mediump mat4 projMatrix;
    varying lowp vec3 v;
    varying float size_v;

    varying lowp vec4 eyePos;

    uniform float size;
    uniform vec3 offset;

    void main(void) {

      vec4 theVert = vec4(size*aVertexPosition+offset,1.0);

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = aVertexNormal;
      eyePos = uMVMatrix * theVert;
      mvMatrix = uMVMatrix;
      v = vec3(uMVMatrix * theVert);

      projMatrix = uPMatrix;
      size_v = size;
      vTexture = aVertexTexture;
    }
`;

export {twod_vertex_shader_source};
