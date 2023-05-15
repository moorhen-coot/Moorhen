var twod_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aVertexTexture;

    in vec4 aVertexColour;
    in vec3 size;
    in vec3 offset;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 TextureMatrix;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;
    out lowp vec2 vTexture;
    out mediump mat4 mvMatrix;
    out mediump mat4 projMatrix;
    out lowp vec3 v;
    out float size_v;
    out lowp vec4 ShadowCoord;

    out lowp vec4 eyePos;

    void main(void) {

      float silly_scale = 1.4142135623730951;
      vec4 theVert = vec4(silly_scale*size[0]*aVertexPosition+offset,1.0);

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
