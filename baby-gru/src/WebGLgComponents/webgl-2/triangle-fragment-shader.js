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

      // Transparent geometry hidden behind the opaque scene.
      //
      // When the opaque scene is drawn once into its own layer rather than into every peel
      // layer, this is what stops transparent fragments behind it surviving. It cannot be done
      // by seeding the layer's depth buffer with the opaque depth instead: the compositing step
      // decides whether a layer drew anything at all by testing that same depth against 1.0, so
      // an opaque depth sitting in it makes every covered pixel look drawn, and the layer's
      // background colour washes over the opaque surface. That is what white ribbons under a
      // transparent surface looked like.
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
          // No gl_FrontFacing test. There used to be one here, and only here: the first transparent
          // layer runs without this block, so it kept back faces and every later layer threw them
          // away. Whether a back-facing surface showed therefore depended on whether anything
          // transparent was in front of it - the far inside wall of a clipped-open surface vanished
          // behind a hover ball, which was then blended over the bare background and came out
          // cream. Every layer now keeps every face, as a see-through surface really looks.
          if(gl_FragCoord.z <= max_depth || abs(gl_FragCoord.z - max_depth)<1e-6 ) {
              discard;
          }
      }
`;

const triangle_fragment_shader_body = (discards) => `#version 300 es\n

    precision mediump float;

    // GLSL ES 3.00 gives a fragment shader no default precision for sampler2DShadow - unlike
    // sampler2D - so leaving it out is a compile error, not a warning: "No precision specified".
    // highp because the comparison is against a 24-bit depth texture over a range now fitted to
    // the scene, where mediump's ~16 bits would quantise the very differences being tested.
    precision highp sampler2DShadow;

    vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution);

    in lowp vec4 vColor;

    // A fade applied to the whole buffer: 1.0 leaves it alone, 0.0 makes it vanish. Set per draw
    // from DisplayBuffer.alphaMultiplier, so a movie can fade an object in or out without touching
    // a single vertex. Defaults to 1.0 for the many draws that never set it.
    uniform float alphaMultiplier;
    in lowp vec3 vNormal;
    in lowp vec4 eyePos;

    // The vertex shader has forwarded this for years with nothing on the other side to read it,
    // so it was dropped at link time. Declaring it here is what connects aVertexTexture through.
    // highp: a lowp coordinate is ten bits on hardware that honours it, a few texels' error
    // across a 2048 image, and the normal map's derivatives below are taken of it.
    in highp vec2 vTexture;

    // The position in the frame vNormal is in, for the normal map's tangent frame (below). Every
    // vertex shader paired with this one writes it; only the normal map reads it.
    in highp vec3 vModelPos;

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

    // glTF's normal and metallic-roughness maps (textureRegistry.ts, SurfaceMaps). Each changes
    // nothing while its flag is off, which it is for everything but a textured mesh that has one,
    // so the arithmetic every other surface goes through is exactly what it was.
    //
    // The normal map is in tangent space, and the meshes carry no tangents: the frame is worked
    // out per pixel from how the position and the texture coordinate change across the screen
    // (materialFrame). normalScale is glTF's normalTexture.scale.
    uniform bool hasNormalTexture;
    uniform sampler2D normalTexture;
    uniform float normalScale;

    // Roughness in G, metallic in B, times glTF's factors (x metallic, y roughness). This is not a
    // physically based shader and does not pretend to be: roughness widens and dims the Phong
    // highlight, and metallic tints the highlight with the base colour and trades diffuse light
    // for a reflection of a simple studio (metalReflection). Ambient light is left alone.
    uniform bool hasMetallicRoughnessTexture;
    uniform sampler2D metallicRoughnessTexture;
    uniform vec2 metallicRoughnessFactors;

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
    // highp, as is max_depth in the peel test. Samplers default to lowp and floats here to
    // mediump, which Chrome (ANGLE) lets the driver run in 16 bits: depth then rounds to ~5e-4,
    // far coarser than the peel test's 1e-6, and a later layer re-captures the same surface
    // wherever the rounding falls the wrong way - rows of dots along lines of equal depth.
    // Firefox runs everything at highp, which is why only Chrome showed it.
    uniform highp sampler2D depthPeelSamplers;
    /** The opaque scene's depth, when it is drawn separately from the peel layers. */
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

    // The normal map's normal, in the frame of N, from the surface's tangent frame at this pixel.
    //
    // T and B are the directions in which u and v increase along the surface, solved for from the
    // screen-space derivatives of position and coordinate: dP = T du + B dv along both screen
    // axes. Solving it outright, rather than with the usual cross-product shortcut, makes the
    // result independent of which way the screen's y axis runs and right for mirrored mappings.
    // Both are then made perpendicular to N, which is interpolated and so not quite in the plane
    // of the triangle.
    //
    // glTF puts +Y "up" in the image, which with v increasing downwards is minus B.
    // highp throughout: the derivatives are small numbers multiplied together, which mediump's
    // range (down to about 6e-5) would flush to zero on hardware that honours it.
    vec3 mappedNormal(highp vec3 N) {
        // Sampled before anything can return early, since the sampler's level of detail comes
        // from derivatives that have no defined value outside uniform control flow.
        highp vec3 m = texture(normalTexture, vTexture).xyz * 2.0 - 1.0;
        m.xy *= normalScale;
        highp vec3 dp1 = dFdx(vModelPos);
        highp vec3 dp2 = dFdy(vModelPos);
        highp vec2 duv1 = dFdx(vTexture);
        highp vec2 duv2 = dFdy(vTexture);
        highp float det = duv1.x * duv2.y - duv1.y * duv2.x;
        highp vec3 t = dp1 * duv2.y - dp2 * duv1.y;
        highp vec3 b = dp2 * duv1.x - dp1 * duv2.x;
        t -= N * dot(N, t);
        b -= N * dot(N, b);
        // A coordinate that does not change across the pixel (a degenerate mapping) leaves no
        // frame to speak of; the geometric normal is the honest answer there.
        if(abs(det) < 1e-20 || dot(t, t) < 1e-20 || dot(b, b) < 1e-20) return N;
        highp float handed = det < 0.0 ? -1.0 : 1.0;
        return normalize(handed * (normalize(t) * m.x - normalize(b) * m.y) + N * m.z);
    }

    // What a metal shows in place of diffuse light: a reflection of a plain studio, bright towards
    // the light and dim away from it, as a fraction of the diffuse light. A metal has no diffuse
    // light of its own - it only reflects - and with nothing to reflect but the one light's
    // highlight it went dark and flat. Taken from the view direction's reflection, so it moves
    // over the surface as the view turns, which is what reads as metal; a rough metal blurs it
    // towards the normal's own view of the light, which is to say back towards diffuse.
    float metalReflection(vec3 N, vec3 E, vec3 L, float roughness) {
        vec3 Rv = reflect(-E, N);
        float t = mix(dot(Rv, L), dot(N, L), roughness);
        float w = 0.25 + 0.75 * roughness;
        return mix(0.2, 1.0, smoothstep(-w, w, t));
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
      if(hasNormalTexture){
          norm = mappedNormal(norm);
      }

      vec4 theColor = vec4(vColor);
      if(hasBaseColourTexture){
          theColor.rgb *= texture(baseColourTexture, vTexture).rgb;
      }

      // The metallic-roughness map's say in the lighting; exactly the old values without one.
      float shininess = specularPower;
      vec4 specularTint = vec4(1.0);
      float diffuseShare = 1.0;
      float roughness = 1.0;
      float metallic = 0.0;
      if(hasMetallicRoughnessTexture){
          vec4 mr = texture(metallicRoughnessTexture, vTexture);
          roughness = clamp(mr.g * metallicRoughnessFactors.y, 0.05, 1.0);
          metallic = clamp(mr.b * metallicRoughnessFactors.x, 0.0, 1.0);
          // The Phong exponent with roughly the spread of a microfacet lobe of this roughness
          // (Blinn-Phong's 2/a^2 - 2 with a = roughness^2, a quarter of it for Phong's reflected
          // ray), and less of it the rougher the surface.
          float r2 = roughness * roughness;
          shininess = clamp((2.0 / (r2 * r2) - 2.0) / 4.0, 1.0, 1024.0);
          specularTint = vec4(mix(vec3(1.0), theColor.rgb, metallic) * (1.0 - roughness), 1.0);
          diffuseShare = 1.0 - metallic;
      }

      E = screenZFrag;
      L = light_positions.xyz;
      R = normalize(-reflect(L,norm));
      Iamb += light_colours_ambient;

      Idiff += light_colours_diffuse * max(dot(norm,L), 0.0) * diffuseShare;
      if(hasMetallicRoughnessTexture){
          Idiff += light_colours_diffuse * metallic * metalReflection(norm, E, normalize(L), roughness);
      }

      float y = max(max(light_colours_specular.r,light_colours_specular.g),light_colours_specular.b);
      Ispec += specularTint * light_colours_specular * pow(max(dot(R,E),0.0),shininess);
      Ispec.a *= y;

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);

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

      // Last, so it scales whatever the rest of the shader decided the alpha was - the vertex
      // colour, the hover highlight's fade, all of it.
      fragColor.a *= alphaMultiplier;

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
