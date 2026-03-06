#version 300 es
precision mediump float;

in vec2 vUv;
in vec4 vTint;

uniform sampler2D uTexture;

out vec4 outColor;

void main() {
  vec4 texColor = texture(uTexture, vUv);
  outColor = texColor * vTint;
}