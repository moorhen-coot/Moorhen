var triangle_vertex_shader_source = `#version 300 es\n

    precision mediump usampler2D;

    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec2 aVertexTexture;

    uniform usampler2D uPointTex;
    uniform sampler2D uWeightTex;
    uniform usampler2D uOffsetTex;
    uniform uint uHoveredPoint;
    uniform uint uPointTexWidth;
    uniform uint uOffsetTexWidth;
    uniform uint uWeightTexWidth;

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 TextureMatrix;

    uniform vec3 outlineSize;

    out lowp vec4 vColor;
    out lowp vec3 vNormal;
    out lowp vec2 vTexture;
    out mediump mat4 mvInvMatrix;
    out lowp vec4 ShadowCoord;

    out lowp vec4 eyePos;

    out float vHighlight;


    uint fetchOffset(uint idx) {
        uint x = idx % uOffsetTexWidth;
        uint y = idx / uOffsetTexWidth;

        return texelFetch( uOffsetTex, ivec2(int(x), int(y)), 0).r;
    }

    uint fetchPoint(uint idx) {
        uint x = idx % uPointTexWidth;
        uint y = idx / uPointTexWidth;

        return texelFetch( uPointTex, ivec2(int(x), int(y)), 0).r;
    }

    float fetchWeight(uint idx) {
        uint x = idx % uWeightTexWidth;
        uint y = idx / uWeightTexWidth;

        return texelFetch( uWeightTex, ivec2(int(x), int(y)), 0).r;
    }

    float weightForHoveredPoint(uint vertexId) {
        uint begin = (vertexId == 0u) ? 0u : fetchOffset(vertexId - 1u);
        uint end = fetchOffset(vertexId);

        for(uint i = begin; i < end; ++i) {
            if(fetchPoint(i) == uHoveredPoint) {
                return fetchWeight(i);
            }
        }

        return 0.0;
    }

    void main(void) {

      //float vHighlight;
      uint maxHover = 0xFFFFFFFFu;
      if(uHoveredPoint<maxHover){
          vHighlight = weightForHoveredPoint(uint(gl_VertexID));
      } else {
          vHighlight = 1.0;
      }

      vec4 theVert = vec4(aVertexPosition+outlineSize*aVertexNormal,1.0);

      ShadowCoord = TextureMatrix * theVert;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = aVertexNormal;
      eyePos = uMVMatrix * theVert;
      mvInvMatrix = uMVINVMatrix;

      vTexture = aVertexTexture;
    }
`;

export {triangle_vertex_shader_source};
