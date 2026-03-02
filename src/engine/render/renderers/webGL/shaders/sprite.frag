#version 300 es
precision mediump float;

in vec2 vUv;

uniform sampler2D uTexture;
uniform vec4 uTint;

out vec4 outColor;

void main() {
  vec4 texColor = texture(uTexture, vUv);
  outColor = texColor * uTint;
}