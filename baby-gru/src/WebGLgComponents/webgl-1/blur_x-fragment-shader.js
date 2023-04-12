var blur_x_fragment_shader_source = `
precision mediump float;

uniform sampler2D shader0;
uniform float blurSize;

varying vec2 out_TexCoord0;

void main()
{
  vec4 color = vec4(0.0);
  color += texture2D( shader0, vec2(out_TexCoord0.x -3.0*blurSize,out_TexCoord0.y)) * 0.015625;
  color += texture2D( shader0, vec2(out_TexCoord0.x -2.0*blurSize,out_TexCoord0.y)) * 0.09375;
  color += texture2D( shader0, vec2(out_TexCoord0.x -1.0*blurSize,out_TexCoord0.y)) * 0.234375;
  color += texture2D( shader0, out_TexCoord0)*0.3125;
  color += texture2D( shader0, vec2(out_TexCoord0.x +1.0*blurSize,out_TexCoord0.y)) * 0.234375;
  color += texture2D( shader0, vec2(out_TexCoord0.x +2.0*blurSize,out_TexCoord0.y)) * 0.09375;
  color += texture2D( shader0, vec2(out_TexCoord0.x +3.0*blurSize,out_TexCoord0.y)) * 0.015625;

  gl_FragColor = color;
}
`;

export {blur_x_fragment_shader_source};
