var shadow_depth_perfect_sphere_fragment_shader_source = `
    precision mediump float;
    varying lowp vec4 vColor;
    varying lowp vec4 eyePos;
    varying lowp vec2 vTexture;

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
    uniform vec4 fogColour;

    void main(void) {
      float x = 2.0*(vTexture.x-.5);
      float y = 2.0*(vTexture.y-.5);
      float zz =  1.0 - x*x - y*y;
      float z = sqrt(zz);

      if(zz <= 0.06)
          discard;

      if(dot(eyePos, clipPlane0)<0.0){
          discard;
      }

      gl_FragColor = vColor;

    }
`;

export {shadow_depth_perfect_sphere_fragment_shader_source};
