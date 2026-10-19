var triangle_instanced_vertex_shader_source = `#version 300 es\n
    in vec3 aVertexPosition;
    in vec4 aVertexColour;
    in vec3 aVertexNormal;
    in vec2 aVertexTexture;
    in vec3 instancePosition;
    in vec3 instanceSize;
    in mat4 instanceOrientation;

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

    // Which instance of this buffer is highlighted, or -1 for none. Instanced geometry shares one
    // mesh between all of its instances, so gl_VertexID cannot distinguish them and the highlight
    // has to key on gl_InstanceID instead - unlike the smooth mesh path, which has a genuine
    // per-vertex weight field to sample.
    uniform int uHoveredInstance;

    // The finer-grained alternative: light a contiguous range of vertex ids rather than a whole
    // instance, for a mesh divided into separately hoverable sections. Sections own their own
    // boundary vertices, so no triangle spans two of them and the edge is hard rather than a
    // ramp - vHighlight being a varying, a shared vertex would interpolate across the join.
    //
    // Only meaningful for a mesh with one instance, since a vertex id cannot say which instance
    // it belongs to. -1 disables, as it does for uHoveredInstance.
    uniform int uHighlightFrom;
    uniform int uHighlightTo;

    const float HIGHLIGHT_BOOST = 1.0;

    void main(void) {

      vec4 theVert = vec4(instancePosition,1.0)+instanceOrientation*vec4((outlineSize+instanceSize)*aVertexPosition,1.0);
      theVert.a = 1.0;

      ShadowCoord = TextureMatrix * theVert;

      gl_Position = uPMatrix * uMVMatrix * theVert;
      vColor = aVertexColour;
      vNormal = (instanceOrientation*vec4(aVertexNormal,1.0)).xyz;
      eyePos = uMVMatrix * theVert;
      mvInvMatrix = uMVINVMatrix;

      vTexture = aVertexTexture;

      // Only the hovered instance changes: above 1, so the fragment shader brightens it.
      //
      // Deliberately nothing happens to its siblings. Fading them back would mirror the smooth
      // mesh highlight, but which instances share a buffer is an invisible implementation detail
      // - every sphere in the scene shares one mesh, while a sphere and a cube do not - so fading
      // siblings makes hovering one shape visibly disturb an arbitrary subset of the others.
      bool wholeInstanceLit = uHoveredInstance >= 0 && gl_InstanceID == uHoveredInstance;
      bool sectionLit = uHighlightFrom >= 0 && gl_VertexID >= uHighlightFrom && gl_VertexID < uHighlightTo;
      vHighlight = (wholeInstanceLit || sectionLit) ? 1.0 + HIGHLIGHT_BOOST : 1.0;
    }
`;

export {triangle_instanced_vertex_shader_source};
