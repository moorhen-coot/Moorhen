var text_instanced_vertex_shader_source = `
    attribute vec3 aVertexPosition; // Same for all instances
    attribute vec3 aVertexNormal; // Unused
    attribute vec2 aVertexTexture; // Instance coords in big texture
    attribute vec4 aVertexColour; // Unused
    attribute vec3 size; // Instance relative x,y(and z) scaling
    attribute vec3 offset; // Instance 3D position
    attribute vec4 textureOffsets; // Instance place in big texture
    attribute vec4 screenOffset; // xyz = linked world-space vector, w = screen-space offset

    uniform mat4 uMVMatrix;
    uniform mat4 uMVINVMatrix;
    uniform mat4 uPMatrix;

    uniform float pixelZoom;

    varying lowp vec2 vTexture;
    varying lowp vec4 eyePos;

    void main(void) {

      vec3 textOffset = size * aVertexPosition;

      if (screenOffset.w != 0.0) {
        vec4 originClip = uPMatrix * uMVMatrix * vec4(offset, 1.0);
        vec4 targetClip = uPMatrix * uMVMatrix * vec4(offset + screenOffset.xyz, 1.0);
        vec2 screenDir = targetClip.xy / targetClip.w - originClip.xy / originClip.w;
        float screenDirLength = length(screenDir);
        vec2 perpendicular = screenDirLength > 0.0001 ? normalize(vec2(-screenDir.y, screenDir.x)) : vec2(1.0, 0.0);
        float labelHalfExtent = 0.5 * (abs(perpendicular.x) * size.x + abs(perpendicular.y) * size.y);
        textOffset = size * (aVertexPosition - vec3(0.5, 0.5, 0.0));
        textOffset.xy += perpendicular * (screenOffset.w + labelHalfExtent);
      }

      vec4 theVert = vec4(offset,1.0)+uMVINVMatrix*vec4(pixelZoom*textOffset,1.0);
      theVert.a = 1.0;

      gl_Position = uPMatrix * uMVMatrix * theVert;

      eyePos = uMVMatrix * theVert;

      vTexture = vec2(textureOffsets[0]+aVertexTexture.s*(textureOffsets[1]),textureOffsets[2]+aVertexTexture.t*(textureOffsets[3]));
    }
`;

export {text_instanced_vertex_shader_source};
