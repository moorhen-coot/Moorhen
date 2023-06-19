var triangle_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec2 aVertexTexture;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 TextureMatrix;

    uniform vec3 outlineSize;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;
    out lowp vec2 vTexture;
    out mediump mat4 mvInvMatrix;
    out lowp vec3 v;
    out lowp vec4 ShadowCoord;

    out lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(aVertexPosition+outlineSize*aVertexNormal,1.0);

      ShadowCoord = TextureMatrix * theVert;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = aVertexNormal;
      eyePos = uMVMatrix * theVert;
      mvInvMatrix = uMVINVMatrix;
      v = vec3(uMVMatrix * theVert);

      vTexture = aVertexTexture;
    }
`;

export {triangle_vertex_shader_source};
