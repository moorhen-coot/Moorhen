/*
 * Two variants of one shader, differing only in whether they can discard.
 *
 * A fragment shader that can discard forces the hardware to run it before resolving depth,
 * because the shader might yet decide the fragment does not exist. Early depth rejection is
 * therefore switched off for the whole program - not just where the discard sits, but
 * everywhere, since the compiler only sees that discard is reachable. On a ribbon model you
 * look through ten or more layers, so this is the difference between shading the visible
 * surface and shading all of it. It is worth about 8% on an immediate-mode renderer and 40%
 * on Apple's tile-based hardware, where hidden-surface removal is the entire architecture.
 *
 * The discards here were doing two jobs, and neither needs doing in the common case:
 *
 *   The clip planes are the front and back of the view slab, always view-aligned - (0,0,-1,d0)
 *   and (0,0,1,d1). The orthographic projection already passes exactly those as its near and
 *   far (see the mat4.ortho call in drawCore), so the hardware clips the slab before the
 *   fragment shader is reached and this test can only ever agree with it. Under perspective
 *   the projection uses fixed near/far instead, so there the test is still doing real work.
 *
 *   The depth peel test is genuine, but only runs during peeling, which only happens when
 *   something transparent is in the scene.
 *
 * So the fast variant drops both and is used whenever the projection is orthographic and
 * nothing is being peeled, which includes ordinary model building with clipping switched on.
 *
 * Composed from one body with a flag rather than derived from the other by string surgery, so
 * the two cannot drift apart as the shader is edited.
 */
const clipAndPeelDiscards = `
      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }

      if(peelNumber>0) {
          vec2 tex_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling);
          float max_depth;
          max_depth = texture(depthPeelSamplers,tex_coord).r;
          if(gl_FragCoord.z <= max_depth || abs(gl_FragCoord.z - max_depth)<1e-6 || gl_FrontFacing!=true ) {
              discard;
          }
      }
`;

const triangle_fragment_shader_body = (discards) => `#version 300 es\n

    precision mediump float;

    vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution);

    in lowp vec4 vColor;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;

    // The vertex shader has forwarded this for years with nothing on the other side to read it,
    // so it was dropped at link time. Declaring it here is what connects aVertexTexture through.
    in lowp vec2 vTexture;

    // Multiplied into the vertex colour rather than replacing it, which is what glTF specifies
    // for a baseColorTexture against its baseColorFactor: a white vertex colour shows the texture
    // untouched and a coloured one tints it, so an object's colour stays meaningful.
    //
    // Only the RGB is taken. Alpha is left to the vertex colour, because transparency here is
    // decided per buffer before anything is drawn - the depth-peel pass order depends on it - and
    // a texture's alpha is not known until it is sampled. A texture with holes in it therefore
    // draws them opaque for now, which is wrong but obvious, rather than half-working through the
    // peel in a way that depends on draw order.
    uniform bool hasBaseColourTexture;
    uniform sampler2D baseColourTexture;

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
    uniform bool occludeDiffuse;
    uniform int shadowQuality;
    uniform float ssaoMultiviewWidthHeightRatio;

    in mediump mat4 mvInvMatrix;

    in float vHighlight;

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

    uniform float zoom;

    out vec4 fragColor;

    float lookup(vec2 offSet){
      vec2 resolution;
      resolution.x = xSSAOScaling/zoom/3.;
      resolution.y = ySSAOScaling/zoom/3.;
      float shad = 1.0;
      float bias = 0.005;
      if(texture(ShadowMap, ShadowCoord.xy+offSet*resolution ).x < ShadowCoord.z-bias)
          shad = texture(ShadowMap, ShadowCoord.xy+offSet*resolution ).x - (ShadowCoord.z-bias);
      return shad;
    }

    void main(void) {
${discards ? clipAndPeelDiscards : ""}
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
      if(hasBaseColourTexture){
          theColor.rgb *= texture(baseColourTexture, vTexture).rgb;
      }

      vec4 color = (1.5*theColor*Iamb + 1.2*theColor*Idiff);
      color *= occ;

      if(shad<0.5) {
          shad += .5;
          shad = min(shad,1.0);
          color *= shad;
      } else {
          color += Ispec;
      }

      if(gl_FrontFacing!=true){
          // theColor, not vColor, so a back face is textured too. Identical to the old line for
          // anything untextured, since theColor is a copy of vColor until a texture modulates it.
          color = vec4(shad*theColor);
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
      fragColor.a = vColor.a;

      float ring = smoothstep(0.4, 0.45, vHighlight) - smoothstep(0.45, 0.5, vHighlight);

      fragColor.rgb += ring * vec3(0.4, 1.0, 0.0);

      // vHighlight in 0..1 is a smooth mesh influence weight: it fades everything away from the
      // hovered point and the ring above picks out the isoline. Above 1 it means "this whole
      // instance is the highlighted one", which the instanced shapes use - they share one mesh
      // between instances, so there is no per-vertex weight field to fade, and a shape that is
      // the only instance in its buffer would have nothing to fade against anyway.
      //
      // For the 0..1 range the mix below is a no-op and the clamp changes nothing, so the smooth
      // mesh path behaves exactly as before.
      float boost = clamp(vHighlight - 1.0, 0.0, 1.0);
      fragColor.rgb = mix(fragColor.rgb, vec3(1.0, 1.0, 1.0), 0.5 * boost);
      fragColor.a *= min(vHighlight, 1.0);

    }
`;

/** With the clip and peel discards: correct everywhere, and slower everywhere. */
const triangle_fragment_shader_source = triangle_fragment_shader_body(true);

/**
 * Without them: for an orthographic projection with no depth peeling, where the hardware
 * already clips the slab via the projection's near and far planes.
 */
const triangle_fragment_shader_source_fast = triangle_fragment_shader_body(false);

export {triangle_fragment_shader_source, triangle_fragment_shader_source_fast};
