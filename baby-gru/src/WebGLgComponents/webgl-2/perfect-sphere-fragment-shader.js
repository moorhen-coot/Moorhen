var perfect_sphere_fragment_shader_source = `#version 300 es\n

    precision mediump float;

    // GLSL ES 3.00 gives a fragment shader no default precision for sampler2DShadow - unlike
    // sampler2D - so leaving it out is a compile error, not a warning: "No precision specified".
    // highp because the comparison is against a 24-bit depth texture over a range now fitted to
    // the scene, where mediump's ~16 bits would quantise the very differences being tested.
    precision highp sampler2DShadow;

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
    /** Radius of the soft shadow filter, in texels of the part of the map in use. 0 is a hard edge. */
    uniform float shadowSoftness;
    uniform float ssaoMultiviewWidthHeightRatio;

    uniform bool clipCap;

    uniform int peelNumber;
    uniform highp sampler2D depthPeelSamplers;

    uniform bool haveOpaqueDepth;
    uniform highp sampler2D opaqueDepthSampler;
    uniform float zoom;

    out vec4 fragColor;

    // How this surface's depth in the shadow map changes per unit of shadow-map uv, worked out once
    // per fragment at the top of main. See lookup.
    highp vec2 shadowDepthSlope;

    // The receiver plane: solve the screen-space derivatives of ShadowCoord for dz/du and dz/dv.
    // Done before any discard, because derivatives stop being meaningful once neighbouring fragments in
    // the 2x2 quad have taken a different path. Zero where the surface is edge-on to the light
    // and the system has no useful solution.
    highp vec2 receiverPlaneDepthSlope() {
      highp vec3 dx = dFdx(ShadowCoord.xyz);
      highp vec3 dy = dFdy(ShadowCoord.xyz);
      highp mat2 uvPerPixel = mat2(dx.x, dy.x, dx.y, dy.y);
      if(abs(determinant(uvPerPixel)) < 1e-14) return vec2(0.0);
      return inverse(uvPerPixel) * vec2(dx.z, dy.z);
    }

    float lookup(vec2 offSet){
      // Offsets in shadow-map texels. xPixelOffset and yPixelOffset are 1/width and 1/height of
      // the shadow texture, already set from rttFramebufferDepth - this used to offset by
      // xSSAOScaling/zoom instead, a scale borrowed from SSAO with no relation to the shadow
      // map's resolution, so the kernel's footprint changed as you zoomed and bore no fixed
      // relationship to a texel.
      // highp: at mediump a shadow-map coordinate has about 11 bits, too few to address the
      // texels of a 4096 map - the comparison lands on the wrong texel and the result speckles.
      highp vec2 duv = offSet * vec2(xPixelOffset, yPixelOffset);
      highp vec2 uv = ShadowCoord.xy + duv;
      // One fetch does the comparison and blends the four texels around it: the unit returns the
      // fraction of that 2x2 the fragment is in front of. 1.0 is fully lit, as before.
      //
      // The bias is in normalised depth, so what it means in angstrom depends on the light's
      // near-to-far range. That range used to be a fixed 0.1 to 1000 whatever the scene, making
      // this about 5 A - wider than an alpha helix, which is why shadows sat away from their
      // casters. Now that the range is fitted to the scene it comes to well under one.
      //
      // Each tap compares against the depth the surface itself has at that tap, not at the
      // fragment. A soft kernel reaches several texels out, and on a surface sloped to the light
      // the flat bias above is soon smaller than the change in the surface's own depth over that
      // distance, so the surface shadows itself in speckles - worse the softer the shadow.
      // Following the plane removes that for any radius. Capped at twice the bias so that
      // near edge-on surfaces, where the slope runs away, cannot push the comparison far enough
      // behind a real occluder to let light through it.
      highp float alongSurface = clamp(dot(shadowDepthSlope, duv), -0.01, 0.01);
      //
      // And a texel's worth of that slope on top of the flat bias. Each texel holds one depth
      // for the whole of its area, so a sloped surface sits up to a texel's slope in front of or
      // behind it. Negligible at full resolution, but a soft shadow renders a coarser map and the
      // speckles would come straight back.
      highp float withinTexel = min(dot(abs(shadowDepthSlope), vec2(xPixelOffset, yPixelOffset)), 0.01);
      return texture(ShadowMap, vec3(uv, ShadowCoord.z + alongSurface - 0.005 - withinTexel));
    }

    void main(void) {
      shadowDepthSlope = receiverPlaneDepthSlope();

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
      if(haveOpaqueDepth) {
          vec2 opaque_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling);
          if(gl_FragCoord.z > texture(opaqueDepthSampler,opaque_coord).r) {
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
          if(shadowSoftness <= 0.0){
              shad = lookup(vec2(0.0,0.0));
          } else {
              // A grid of taps no more than a texel apart, each of which already blends the 2x2
              // texels around it, so the sum is a continuous ramp - a gradient, not grain. A
              // spacing of exactly the texel pitch or less keeps the taps from beating against
              // the texel grid, which at 1.5 texels left a ripple three texels long. Tent-weighted
              // so the penumbra falls off softly at both ends rather than as a straight ramp.
              //
              // shadowSoftness arrives in texels and is held to a few of them by sizing the map
              // to it (softShadowRegion), so the grid stays small at any zoom: at most 9x9 on
              // screen and 16x16 for screenshots.
              int n = clamp(int(ceil(2.0*shadowSoftness)) + 1, 2, 16);
              float spacing = 2.0*shadowSoftness/float(n-1);
              float reach = shadowSoftness + spacing;
              float total = 0.0;
              shad = 0.0;
              for (int j = 0; j < n; j++) {
                  for (int i = 0; i < n; i++) {
                      vec2 p = vec2(float(i), float(j)) * spacing - shadowSoftness;
                      vec2 tent = 1.0 - abs(p) / reach;
                      float w = tent.x * tent.y;
                      shad += w * lookup(p);
                      total += w;
                  }
              }
              shad /= total;
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
