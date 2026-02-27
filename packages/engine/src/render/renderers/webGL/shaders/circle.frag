#version 300 es
precision mediump float;

in vec2 vUv;

uniform vec4 uColor;

out vec4 outColor;

void main() {
  vec2 centered = vUv * 2.0 - 1.0;
  float distanceSquared = dot(centered, centered);

  if (distanceSquared > 1.0) {
    discard;
  }

  outColor = uColor;
}