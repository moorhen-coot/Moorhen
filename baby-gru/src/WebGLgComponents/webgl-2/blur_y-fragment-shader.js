var blur_y_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;
uniform sampler2D shader0;
uniform float blurSize;

in vec2 out_TexCoord0;

void main()
{
  vec4 color = vec4(0.0);
  color += texture( shader0, vec2(out_TexCoord0.x,out_TexCoord0.y -3.0*blurSize)) * 0.015625;
  color += texture( shader0, vec2(out_TexCoord0.x,out_TexCoord0.y -2.0*blurSize)) * 0.09375;
  color += texture( shader0, vec2(out_TexCoord0.x,out_TexCoord0.y -1.0*blurSize)) * 0.234375;
  color += texture( shader0, out_TexCoord0)*0.3125;
  color += texture( shader0, vec2(out_TexCoord0.x,out_TexCoord0.y +1.0*blurSize)) * 0.234375;
  color += texture( shader0, vec2(out_TexCoord0.x,out_TexCoord0.y +2.0*blurSize)) * 0.09375;
  color += texture( shader0, vec2(out_TexCoord0.x,out_TexCoord0.y +3.0*blurSize)) * 0.015625;

  fragColor = color;
}
`;

export {blur_y_fragment_shader_source};
