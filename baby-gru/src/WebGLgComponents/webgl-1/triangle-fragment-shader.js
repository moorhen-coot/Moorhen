var triangle_fragment_shader_source = `

    precision mediump float;

    vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution);

    varying lowp vec4 vColor;
    varying lowp vec3 vNormal;
    varying lowp vec4 eyePos;
    varying lowp vec3 v;

    varying lowp vec4 ShadowCoord;
    uniform sampler2D ShadowMap;
    uniform float xPixelOffset;
    uniform float yPixelOffset;
    uniform float xSSAOScaling;
    uniform float ySSAOScaling;
    uniform bool doShadows;
    uniform int shadowQuality;

    varying mediump mat4 mvInvMatrix;

    uniform vec4 fogColour;

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

    uniform bool shinyBack;
    uniform bool defaultColour;
    uniform vec4 backColour;

    uniform vec4 light_positions;
    uniform vec4 light_colours_ambient;
    uniform vec4 light_colours_specular;
    uniform vec4 light_colours_diffuse;
    uniform float specularPower;
    uniform vec3 screenZFrag;

    uniform int peelNumber;
    uniform sampler2D depthPeelSamplers;

    float lookup(vec2 offSet){
      vec2 resolution;
      resolution.x = 1.0/xSSAOScaling;
      resolution.y = 1.0/ySSAOScaling;
      float shad = 1.0;
      float bias = 0.005;
      if(fxaa(ShadowMap, ShadowCoord.xy*resolution, resolution ).x < ShadowCoord.z-bias)
          shad = 0.2;
      return shad;
    }

    void main(void) {
      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }

      if(peelNumber>0) {
          vec2 tex_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*xSSAOScaling);
          float max_depth;
          max_depth = texture2D(depthPeelSamplers,tex_coord).r;
          if(gl_FragCoord.z <= max_depth || abs(gl_FragCoord.z - max_depth)<1e-6 ) {
              discard;
          }
      }

      float shad = 1.0;
      if(doShadows){
          if(shadowQuality==0){
              shad = lookup(vec2(0.0,0.0));
          } else {
              shad = lookup(vec2(0.0,0.0));
              /*
              //FIXME - this is invalid in WebGL 1 for some reason.
              shad = 0.0;
              float x,y;
              for (y = -3.5 ; y <=3.5 ; y+=1.0)
                  for (x = -3.5 ; x <=3.5 ; x+=1.0)
                      shad += lookup(vec2(x,y));
              shad /= 64.0 ;
              */
          }
      }
          

      vec3 L;
      vec3 E;
      vec3 R;
      vec4 Iamb =vec4(0.0,0.0,0.0,0.0);
      vec4 Idiff=vec4(0.0,0.0,0.0,0.0);
      vec4 Ispec=vec4(0.0,0.0,0.0,0.0);
      vec3 norm = normalize(vNormal);

      E = screenZFrag;
      L = light_positions.xyz;
      R = normalize(-reflect(L,norm));
      Iamb += light_colours_ambient;

      Idiff += light_colours_diffuse * max(dot(norm,L), 0.0);
      float y = max(max(light_colours_specular.r,light_colours_specular.g),light_colours_specular.b);
      Ispec += light_colours_specular * pow(max(dot(R,E),0.0),specularPower);
      Ispec.a *= y;

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);

      vec4 theColor = vec4(vColor);

      vec4 color = (1.5*theColor*Iamb + 1.2*theColor* Idiff);
      if(shad<0.5) {
          shad += .5;
          shad = min(shad,1.0);
          color *= shad;
      } else {
          color += Ispec;
      }
      color.a = vColor.a;

      if(gl_FrontFacing!=true){
          //FIXME - mix !!
          color = vec4(shad*vColor);
          color.a = vColor.a;
      }

      gl_FragColor = mix(color, fogColour, fogFactor );

    }
`;

export {triangle_fragment_shader_source};
