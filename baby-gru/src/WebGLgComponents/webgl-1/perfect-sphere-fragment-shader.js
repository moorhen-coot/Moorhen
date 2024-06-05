var perfect_sphere_fragment_shader_source = `
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
    uniform float xSSAOScaling;
    uniform float ySSAOScaling;
    uniform bool doShadows;
    uniform int shadowQuality;

    uniform bool clipCap;

    uniform int peelNumber;
    uniform sampler2D depthPeelSamplers;

    float lookup(vec2 offSet){
      vec4 coord = ShadowCoord + vec4(offSet.x * xPixelOffset * ShadowCoord.w, offSet.y * yPixelOffset * ShadowCoord.w, 0.07, 0.0);
      if(coord.s>1.0||coord.s<0.0||coord.t>1.0||coord.t<0.0)
          return 1.0;
      float shad = texture2D(ShadowMap, coord.xy ).x;
      shad = shad/(coord.p/coord.q);
      if(shad<0.8){
          shad = 0.0;
      } else {
          shad = 1.0;
      }
      return shad;
    }

    void main(void) {
      float silly_scale = 0.7071067811865475;
      float x = 2.0*(vTexture.x-.5);
      float y = 2.0*(vTexture.y-.5);
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
      gl_FragDepthEXT = (pos.z / pos.w + 1.0) / 2.0;

      if(peelNumber>0) {
          vec2 tex_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*xSSAOScaling);
          float max_depth;
          max_depth = texture2D(depthPeelSamplers,tex_coord).r;
          if(gl_FragDepthEXT <= max_depth || abs(gl_FragDepthEXT - max_depth)<1e-6 ) {
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
       vec3 norm = vec3(x,y,z);

      // Baffled as to why I have to do this.
      vec3 invertLightPos = vec3(light_positions.x,-light_positions.y,light_positions.z);
      E = ( vec4(normalize(norm),1.0)).xyz;
      //for (i = 0; i<nLights&&i<8; i++) {
       L = normalize(invertLightPos);
       //R = normalize(-reflect(L,norm));
       //calculate Ambient Term:
       Iamb += light_colours_ambient;
       //calculate Diffuse Term:
       Idiff += light_colours_diffuse * max(dot(E,L), 0.0);
       // calculate Specular Term:
       y = max(max(light_colours_specular.r,light_colours_specular.g),light_colours_specular.b);
       Ispec += light_colours_specular * pow(max(dot(E,L),0.0),specularPower);
       Ispec.a *= y;
      //}

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

      gl_FragColor = mix(color, fogColour, fogFactor );

      if(clipCap){
        if(clipd<0.0){
            gl_FragColor = mix(vColor, fogColour, fogFactor );
        }
        if(clipd_back<0.0||((1.0-z)*silly_scale*size_v>clipd_back&&clipd<0.0)){
            discard;
        }
      }
    }
`;

export {perfect_sphere_fragment_shader_source};
