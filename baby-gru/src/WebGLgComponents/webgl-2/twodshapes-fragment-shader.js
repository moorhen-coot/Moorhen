var twod_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec4 vColor;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;
    in lowp vec3 v;
    in mediump mat4 mvMatrix;

    in float FogFragCoord;
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

    uniform vec2 cursorPos;

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

      vec4 theColor = vec4(vColor);
      vec4 color = vColor;
      fragColor = mix(anaglyphColour(color), fogColour, fogFactor );

    }
`;

export {twod_fragment_shader_source};
