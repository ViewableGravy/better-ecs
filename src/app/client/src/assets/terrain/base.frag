#version 300 es
precision highp float;

in vec2 vLocal;
in vec4 vColor;
out vec4 outColor;

void main() {
  float hex = max(abs(vLocal.y), abs(vLocal.x) + abs(vLocal.y) * 0.5);
  if (hex > 1.0) discard;
  outColor = vColor;
}
