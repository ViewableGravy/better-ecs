#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec4 uTint;
uniform float uTime;

void main() {
  float time = uTime * 0.001;
  vec2 uv = vUv * 2.0 - 1.0;
  float radius = length(uv);
  float angle = atan(uv.y, uv.x);

  float wave = sin(angle * 3.0 + time * 2.4) * 0.5 + 0.5;
  float pulse = sin(time * 3.0 - radius * 12.0) * 0.5 + 0.5;

  vec3 rainbow = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + angle + time * 1.2);
  vec3 procedural = mix(rainbow, rainbow * 0.35, radius);
  procedural *= mix(0.65, 1.35, pulse);
  procedural *= mix(0.8, 1.2, wave);

  float edge = smoothstep(1.0, 0.78, radius);
  vec4 tex = texture(uTexture, vUv);
  float alpha = max(edge, tex.a * edge);

  fragColor = vec4(procedural * tex.rgb, alpha) * uTint;
}
