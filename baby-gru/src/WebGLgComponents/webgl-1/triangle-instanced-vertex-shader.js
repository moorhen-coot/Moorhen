var triangle_instanced_vertex_shader_source = `
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColour;
    attribute vec3 aVertexNormal;
    attribute vec2 aVertexTexture;
    attribute vec3 instancePosition;
    attribute vec3 instanceSize;
    attribute mat4 instanceOrientation;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 TextureMatrix;

    varying lowp vec4 vColor;
    varying lowp vec3 vNormal;
    varying lowp vec2 vTexture;
    varying mediump mat4 mvInvMatrix;
    varying lowp vec3 v;
    varying lowp vec4 ShadowCoord;

    varying lowp vec4 eyePos;

    void main(void) {

      vec4 theVert = vec4(instancePosition,1.0)+instanceOrientation*vec4(instanceSize*aVertexPosition,1.0);
      theVert.a = 1.0;

      ShadowCoord = TextureMatrix * theVert;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = (instanceOrientation*vec4(aVertexNormal,1.0)).xyz;
      eyePos = uMVMatrix * theVert;
      mvInvMatrix = uMVINVMatrix;
      v = vec3(uMVMatrix * theVert);

      vTexture = aVertexTexture;
    }
`;

export {triangle_instanced_vertex_shader_source};
