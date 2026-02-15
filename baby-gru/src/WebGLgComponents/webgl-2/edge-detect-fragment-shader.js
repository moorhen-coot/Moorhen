var edge_detect_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;   // eye-space position (G-buffer)
uniform sampler2D gNormal;     // eye-space normal   (G-buffer)

uniform float depthThreshold;  // relative depth sensitivity  (try 0.05)
uniform float normalThreshold; // normal-change sensitivity   (try 0.8)

// Kept for backward-compat with uniform-location lookups; unused.
uniform float zoom;
uniform float depthBufferSize;
uniform float scaleDepth;
uniform float scaleNormal;
uniform float xPixelOffset;
uniform float yPixelOffset;
uniform float depthFactor;

in vec2 out_TexCoord0;

void main() {

    // One-texel step in the G-buffer, independent of zoom
    vec2 ts = 1.0 / vec2(textureSize(gPosition, 0));

    // ---- centre samples ----
    float mc = texture(gPosition, out_TexCoord0).z;
    vec3  nc = normalize(texture(gNormal,   out_TexCoord0).xyz);

    // ---- 4 cardinal neighbours ----
    float d_u = texture(gPosition, out_TexCoord0 + vec2(  0.0, -ts.y)).z;
    float d_d = texture(gPosition, out_TexCoord0 + vec2(  0.0,  ts.y)).z;
    float d_l = texture(gPosition, out_TexCoord0 + vec2(-ts.x,   0.0)).z;
    float d_r = texture(gPosition, out_TexCoord0 + vec2( ts.x,   0.0)).z;

    vec3 n_u = normalize(texture(gNormal, out_TexCoord0 + vec2(  0.0, -ts.y)).xyz);
    vec3 n_d = normalize(texture(gNormal, out_TexCoord0 + vec2(  0.0,  ts.y)).xyz);
    vec3 n_l = normalize(texture(gNormal, out_TexCoord0 + vec2(-ts.x,   0.0)).xyz);
    vec3 n_r = normalize(texture(gNormal, out_TexCoord0 + vec2( ts.x,   0.0)).xyz);

    // ================================================================
    //  Depth edge  –  max neighbour depth difference
    //
    //  Each pixel asks: "does ANY of my 4 neighbours have a very
    //  different depth?"  This gives exactly 1-pixel-wide edges
    //  with no bleeding into adjacent pixels (unlike Sobel's 3x3).
    //  Dividing by |centre Z| keeps the threshold zoom-invariant.
    // ================================================================

    float maxDD = max(max(abs(d_u - mc), abs(d_d - mc)),
                      max(abs(d_l - mc), abs(d_r - mc)));

    float absZ = abs(mc);
    float relDepth = (absZ > 0.001) ? maxDD / absZ : 0.0;

    float depthEdge = smoothstep(depthThreshold * 0.7,
                                 depthThreshold * 1.3,
                                 relDepth);

    // ================================================================
    //  Normal edge  –  max neighbour normal difference
    //
    //  Catches crease/fold edges.  Threshold of ~0.8 ignores the
    //  22.5-degree facet seams on 16-segment cylinders (response
    //  ~0.39) while still catching creases >= ~50 degrees.
    // ================================================================

    float maxND = max(max(length(n_u - nc), length(n_d - nc)),
                      max(length(n_l - nc), length(n_r - nc)));

    float normalEdge = smoothstep(normalThreshold * 0.7,
                                  normalThreshold * 1.3,
                                  maxND);

    // ================================================================
    //  Combine – either edge source triggers an outline
    // ================================================================

    float edge = max(depthEdge, normalEdge);

    // 1.0 = no edge,  0.0 = full edge  (for multiplicative compositing)
    fragColor = vec4(vec3(1.0 - edge), 1.0);
}
`;

export {edge_detect_fragment_shader_source};
