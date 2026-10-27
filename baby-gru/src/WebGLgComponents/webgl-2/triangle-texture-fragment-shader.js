var triangle_texture_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in highp vec2 vTexture;
    in lowp vec4 eyePos;

    uniform sampler2D valueMap;
    uniform sampler2D colorMap;

    uniform vec4 fogColour;

    // Anaglyph stereo (drawCore, anaglyph.ts): 1 while an eye is drawn, its colour made grey - its
    // brightest channel, at most 1 - before the fog, as the WebGPU renderer greys an eye.
    uniform float anaglyphGrey;
    vec4 anaglyphColour(vec4 c) {
        if(anaglyphGrey > 0.5) return vec4(vec3(min(max(c.r, max(c.g, c.b)), 1.0)), c.a);
        return c;
    }

    uniform float fog_end;
    uniform float fog_start;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

    out vec4 fragColor;

    void main(void) {

      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);

      float edge = texture(valueMap, vTexture).x;
      vec4 color = texture(colorMap,vec2(edge, 0.5) );
      //vec4 color = vec4(edge,edge,edge,1.0);

      fragColor = mix(anaglyphColour(color), fogColour, fogFactor );
    }
`;

export {triangle_texture_fragment_shader_source};
