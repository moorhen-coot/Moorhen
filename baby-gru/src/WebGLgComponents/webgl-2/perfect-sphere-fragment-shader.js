var perfect_sphere_fragment_shader_source = `#version 300 es\n

    precision mediump float;

    // GLSL ES 3.00 gives a fragment shader no default precision for sampler2DShadow - unlike
    // sampler2D - so leaving it out is a compile error, not a warning: "No precision specified".
    // highp because the comparison is against a 24-bit depth texture over a range now fitted to
    // the scene, where mediump's ~16 bits would quantise the very differences being tested.
    precision highp sampler2DShadow;

    vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution);

    in lowp vec4 vColor;

    // A fade applied to the whole buffer; see DisplayBuffer.alphaMultiplier and objectFade.
    uniform float alphaMultiplier;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;
    in highp vec2 vTexture;
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

    // Anaglyph stereo (drawCore, anaglyph.ts): 1 while an eye is drawn, its colour made grey - its
    // brightest channel, at most 1 - before the fog, as the WebGPU renderer greys an eye.
    uniform float anaglyphGrey;
    vec4 anaglyphColour(vec4 c) {
        if(anaglyphGrey > 0.5) return vec4(vec3(min(max(c.r, max(c.g, c.b)), 1.0)), c.a);
        return c;
    }

    uniform vec4 light_positions;
    uniform vec4 light_colours_ambient;
    uniform vec4 light_colours_specular;
    uniform vec4 light_colours_diffuse;
    uniform float specularPower;

    in mediump mat4 projMatrix;
    in float size_v;

    in highp vec4 ShadowCoord;
    uniform sampler2DShadow ShadowMap;
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
    uniform highp sampler2D depthPeelSamplers;

    uniform bool haveOpaqueDepth;
    uniform highp sampler2D opaqueDepthSampler;
    uniform float zoom;

    out vec4 fragColor;

    float lookup(vec2 offSet){
      // Offsets in shadow-map texels. xPixelOffset and yPixelOffset are 1/width and 1/height of
      // the shadow texture, already set from rttFramebufferDepth - this used to offset by
      // xSSAOScaling/zoom instead, a scale borrowed from SSAO with no relation to the shadow
      // map's resolution, so the kernel's footprint changed as you zoomed and bore no fixed
      // relationship to a texel.
      vec2 uv = ShadowCoord.xy + offSet * vec2(xPixelOffset, yPixelOffset);
      // One fetch does the comparison and blends the four texels around it: the unit returns the
      // fraction of that 2x2 the fragment is in front of. 1.0 is fully lit, as before.
      //
      // The bias is in normalised depth, so what it means in angstrom depends on the light's
      // near-to-far range. That range used to be a fixed 0.1 to 1000 whatever the scene, making
      // this about 5 A - wider than an alpha helix, which is why shadows sat away from their
      // casters. Now that the range is fitted to the scene it comes to well under one.
      return texture(ShadowMap, vec3(uv, ShadowCoord.z - 0.005));
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
      // gl_FragDepth, not gl_FragCoord.z. This is an impostor: gl_FragCoord.z is the depth of the
      // flat quad it is drawn on, at the sphere's centre, while the sphere's real surface is the
      // gl_FragDepth just computed. Testing the quad put every transparent sphere's front half
      // behind any opaque sphere it enclosed - a hover ball around an atom was cut away wherever
      // the atom was, leaving a ring. The peel test below already used gl_FragDepth.
      if(haveOpaqueDepth) {
          vec2 opaque_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling);
          if(gl_FragDepth > texture(opaqueDepthSampler,opaque_coord).r) {
              discard;
          }
      }


      if(peelNumber>0) {
          vec2 tex_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling);
          highp float max_depth;
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
      color *= occ;

      if(shad<0.5) {
          shad += .5;
          shad = min(shad,1.0);
          color *= shad;
      } else {
          color += Ispec;
      }
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
      fragColor = mix(anaglyphColour(color), fogColour, fogFactor );
      //fragColor = vec4(occ,occ,occ, vColor.a);

      //if(doSSAO) fragColor = texture(SSAOMap, vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling) );

      if(clipCap){
        if(clipd<0.0){
            fragColor = mix(anaglyphColour(vColor), fogColour, fogFactor );
        }
        // Discard only where the whole chord through the sphere is in front of the plane. The
        // cap is then the plane's whole cut through the sphere, meeting the lit surface exactly
        // where the front surface crosses the plane (clipd = 0). This used to discard also where
        // (1-z)*r > clipd_back while capped, which cut a ring out of the cap's edge whenever the
        // centre was less than r/3 behind the plane. (A sphere whose centre is in front of the
        // plane is not drawn at all: its square sits at the centre's depth, nearer than the
        // projection's near plane, which is this plane.)
        if(clipd_back<0.0){
            discard;
        }
      }

      // Last, and after the clip cap's own assignment, so a capped sphere fades with the rest.
      fragColor.a *= alphaMultiplier;
    }
`;

export {perfect_sphere_fragment_shader_source};
