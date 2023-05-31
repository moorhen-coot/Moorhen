var twod_vertex_shader_source = `
#extension GL_OES_element_index : enable
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aVertexTexture;

    attribute vec4 aVertexColour;
    attribute vec3 size;
    attribute vec3 offset;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 TextureMatrix;
    uniform mat4 uINVSymmMatrix;

    varying lowp vec4 vColor;
    varying lowp vec3 vNormal;
    varying lowp vec2 vTexture;
    varying mediump mat4 mvMatrix;
    varying mediump mat4 projMatrix;
    varying lowp vec3 v;
    varying float size_v;
    varying lowp vec4 ShadowCoord;

    varying lowp vec4 eyePos;

    void main(void) {

      float silly_scale = 1.4142135623730951;
      vec4 theVert = vec4(silly_scale*size[0]* (uINVSymmMatrix *vec4(aVertexPosition,1.0)).xyz+offset,1.0);

      ShadowCoord = TextureMatrix * theVert;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = aVertexNormal;
      eyePos = uMVMatrix * theVert;
      mvMatrix = uMVMatrix;
      v = vec3(uMVMatrix * theVert);

      projMatrix = uPMatrix;
      size_v = silly_scale*size[0];
      vTexture = aVertexTexture;
    }
`;

export {twod_vertex_shader_source};
