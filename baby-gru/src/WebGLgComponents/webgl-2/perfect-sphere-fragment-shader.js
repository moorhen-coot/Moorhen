var perfect_sphere_fragment_shader_source = `#version 300 es\n

    precision mediump float;

    vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution);

    in lowp vec4 vColor;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;
    in lowp vec2 vTexture;
    in mediump mat4 mvMatrix;

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

    uniform vec4 light_positions;
    uniform vec4 light_colours_ambient;
    uniform vec4 light_colours_specular;
    uniform vec4 light_colours_diffuse;
    uniform float specularPower;

    in mediump mat4 projMatrix;
    in float size_v;

    in lowp vec4 ShadowCoord;
    uniform sampler2D ShadowMap;
    uniform sampler2D SSAOMap;
    uniform sampler2D edgeDetectMap;
    uniform float xPixelOffset;
    uniform float yPixelOffset;
    uniform float xSSAOScaling;
    uniform float ySSAOScaling;
    uniform bool doShadows;
    uniform bool doSSAO;
    uniform bool doEdgeDetect;
    uniform bool doPerspective;
    uniform int shadowQuality;
    uniform float ssaoMultiviewWidthHeightRatio;

    uniform bool clipCap;

    uniform int peelNumber;
    uniform sampler2D depthPeelSamplers;

    out vec4 fragColor;

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

      float silly_scale = 0.7071067811865475;
      float x = 2.0*(vTexture.x-.5);
      float y = -2.0*(vTexture.y-.5);
      float zz =  1.0 - x*x - y*y;
      float z = sqrt(zz);

      if(zz <= 0.06)
          discard;

      if(dot(eyePos, clipPlane1)<0.0){
           discard;
      }

      vec4 pos = eyePos;
      pos.z += silly_scale*z*size_v;
      pos = projMatrix * pos;
      gl_FragDepth = (pos.z / pos.w + 1.0) / 2.0;

      if(peelNumber>0) {
          vec2 tex_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*xSSAOScaling);
          float max_depth;
          max_depth = texture(depthPeelSamplers,tex_coord).r;
          if(gl_FragDepth <= max_depth || abs(gl_FragDepth - max_depth)<1e-6 ) {
              discard;
          }
      }

      float clipd;
      float clipd_back;
      if(clipCap){
          vec4 posclip = eyePos;
          vec4 posclip_back = eyePos;
          posclip.z += silly_scale*z*size_v;
          vec4 clip_plane_back = clipPlane0;
          clip_plane_back.w += silly_scale*z*size_v;
          clipd_back=dot(posclip_back, clip_plane_back);
          clipd = dot(posclip, clipPlane0);
      }

      if(!clipCap){
          if(dot(eyePos, clipPlane0)<0.0){
              discard;
          }
      }

      float shad = 1.0;
      if(doShadows){
          if(shadowQuality==0){
              shad = lookup(vec2(0.0,0.0));
          } else {
              shad = 0.0;
              float x,y;
              for (y = -3.5 ; y <=3.5 ; y+=1.0)
                  for (x = -3.5 ; x <=3.5 ; x+=1.0)
                      shad += lookup(vec2(x,y));
              shad /= 64.0 ;
          }
      }

      float occ = 1.0;
      float theRatio = ssaoMultiviewWidthHeightRatio;
      if(doSSAO){
          if(doPerspective){
              occ = texture(SSAOMap, vec2(0.35*gl_FragCoord.x*xSSAOScaling+0.325,0.35*gl_FragCoord.y*ySSAOScaling+0.325) ).z;
          } else {
              if(theRatio>1.0){
                  occ = texture(SSAOMap, vec2(gl_FragCoord.x*xSSAOScaling,theRatio*gl_FragCoord.y*ySSAOScaling-(theRatio-1.0)/2.0) ).z;
              } else {
                  float diff = ((1.0 - theRatio)/2.) / (theRatio);
                  occ = texture(SSAOMap, vec2(gl_FragCoord.x*xSSAOScaling/theRatio-diff,gl_FragCoord.y*ySSAOScaling) ).z;
              }
          }
      }


      vec3 L;
      vec3 E;
      vec3 R;
      vec4 Iamb =vec4(0.0,0.0,0.0,0.0);
      vec4 Idiff=vec4(0.0,0.0,0.0,0.0);
      vec4 Ispec=vec4(0.0,0.0,0.0,0.0);
       vec3 norm = vec3(x,y,z);

      E = normalize(norm);
      L = normalize(light_positions.xyz);
      //R = normalize(-reflect(L,norm));
      //calculate Ambient Term:
      Iamb += light_colours_ambient;
      //calculate Diffuse Term:
      Idiff += light_colours_diffuse * max(dot(E,L), 0.0);
      // calculate Specular Term:
      y = max(max(light_colours_specular.r,light_colours_specular.g),light_colours_specular.b);
      Ispec += light_colours_specular * pow(max(dot(E,L),0.0),specularPower);
      Ispec.a *= y;

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);

      vec4 theColor = vec4(vColor);

      vec4 color = (1.5*theColor*Iamb + 1.2*theColor*Idiff);
      if(shad<0.5) {
          shad += .5;
          shad = min(shad,1.0);
          color *= shad;
      } else {
          color += Ispec;
      }

      color *= occ;
      if(doEdgeDetect){

          vec2 resolution;
          resolution.x = 1.0/xSSAOScaling;
          resolution.y = 1.0/ySSAOScaling;
          float theRatio = ssaoMultiviewWidthHeightRatio;
          float edge;
          if(theRatio>1.0){
             edge = fxaa(edgeDetectMap, vec2(gl_FragCoord.x,gl_FragCoord.y*theRatio-((theRatio-1.0)/2.0)*resolution.y), resolution).x;
          } else {
             float diff = ((1.0 - theRatio)/2.0) / (theRatio) * resolution.y;
             edge = fxaa(edgeDetectMap, vec2(gl_FragCoord.x/theRatio-diff,gl_FragCoord.y), resolution).x;
          }

          color *= edge;
      }
      color.a = vColor.a;
      fragColor = mix(color, fogColour, fogFactor );
      //fragColor = vec4(occ,occ,occ, vColor.a);

      //if(doSSAO) fragColor = texture(SSAOMap, vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling) );

      if(clipCap){
        if(clipd<0.0){
            fragColor = mix(vColor, fogColour, fogFactor );
        }
        if(clipd_back<0.0||((1.0-z)*silly_scale*size_v>clipd_back&&clipd<0.0)){
            discard;
        }
      }
    }
`;

export {perfect_sphere_fragment_shader_source};
