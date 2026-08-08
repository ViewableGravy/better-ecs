#version 300 es
precision mediump float;

uniform sampler2D uTexture;

in vec2 vUv;
out vec4 outColor;

void main() {
  vec4 glyph = texture(uTexture, vUv);
  outColor = glyph * vec4(1.0, 0.85, 0.2, 1.0);
}
