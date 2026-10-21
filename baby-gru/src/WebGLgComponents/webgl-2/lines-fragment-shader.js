var lines_fragment_shader_source = `#version 300 es\n
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

    uniform int peelNumber;
    // highp for the same reason as in the triangle shader: samplers default to lowp, and Chrome on
    // Mesa then runs the depth comparisons in 16 bits and dots transparent surfaces.
    uniform highp sampler2D depthPeelSamplers;
    /** The opaque scene's depth, when it is drawn separately from the peel layers. */
    uniform bool haveOpaqueDepth;
    uniform highp sampler2D opaqueDepthSampler;
    uniform float xSSAOScaling;
    uniform float ySSAOScaling;

    out vec4 fragColor;

    void main(void) {

      if(dot(eyePos, clipPlane0)<0.0){
          discard;
      }

      if(dot(eyePos, clipPlane1)<0.0){
          discard;
      }

      // The same two tests as the triangle shader, and needed for the same reasons. This shader
      // draws the map mesh (via the thick-lines program). With the peel test commented out, every
      // transparent layer kept the same nearest lines, so four layers composited one mesh three
      // times over: a mesh at 0.8 opacity came out nearly opaque, and heavier than the same mesh
      // at 1.0. Without the opaque-depth test, transparent lines behind opaque geometry survived
      // in their layer and were composited on top of it.
      //
      // No gl_FrontFacing test, unlike triangles: a thick line is a screen-aligned quad whose
      // winding says nothing about which side of anything it is on.
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
          if(gl_FragCoord.z <= max_depth || abs(gl_FragCoord.z - max_depth)<1e-6 ) {
              discard;
          }
      }

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);
      fragColor = mix(vColor, fogColour, fogFactor );

    }
`;

export {lines_fragment_shader_source};
