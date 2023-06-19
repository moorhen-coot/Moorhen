var perfect_sphere_outline_fragment_shader_source = `
#extension GL_OES_element_index : enable
#extension GL_EXT_frag_depth : enable
    precision mediump float;
    varying lowp vec4 vColor;
    varying lowp vec3 vNormal;
    varying lowp vec4 eyePos;
    varying lowp vec2 vTexture;
    varying mediump mat4 mvMatrix;

    uniform float fog_end;
    uniform float fog_start;

    uniform sampler2D uSampler;

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

    uniform vec4 light_positions;
    uniform vec4 light_colours_ambient;
    uniform vec4 light_colours_specular;
    uniform vec4 light_colours_diffuse;
    uniform float specularPower;

    varying mediump mat4 projMatrix;
    varying float size_v;

    varying lowp vec4 ShadowCoord;
    uniform sampler2D ShadowMap;
    uniform float xPixelOffset;
    uniform float yPixelOffset;
    uniform bool doShadows;
    uniform int shadowQuality;

    uniform bool clipCap;

    void main(void) {
      float silly_scale = 0.7071067811865475;
      float x = 2.0*(vTexture.x-.5);
      float y = 2.0*(vTexture.y-.5);
      float zz =  1.0 - x*x - y*y;
      float z = sqrt(zz);

      if(zz <= 0.06)
          discard;

      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);

      //gl_FragColor = mix(vColor, fogColour, fogFactor );
      gl_FragColor = vColor;

    }
`;

export {perfect_sphere_outline_fragment_shader_source};
