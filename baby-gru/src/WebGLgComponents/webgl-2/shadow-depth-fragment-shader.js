var shadow_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec4 vColor;
    in lowp vec4 eyePos;

    uniform float fog_end;
    uniform float fog_start;

    uniform vec4 fogColour;

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
      fragColor = vColor;
    }
`;

export {shadow_fragment_shader_source};
