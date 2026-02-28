#version 300 es
precision mediump float;

in vec2 vUv;

uniform vec4 uFillColor;
uniform vec4 uStrokeColor;
uniform float uHasStroke;
uniform float uStrokeThickness;
uniform float uFillEnabled;
uniform vec2 uSize;
uniform float uCornerRadius;

out vec4 outColor;

float roundedRectSdf(vec2 point, vec2 halfSize, float radius) {
  vec2 clampedHalfSize = max(halfSize, vec2(radius));
  vec2 q = abs(point) - (clampedHalfSize - vec2(radius));
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  vec2 local = (vUv - 0.5) * uSize;
  vec2 halfSize = uSize * 0.5;
  float radius = max(0.0, min(uCornerRadius, min(halfSize.x, halfSize.y)));
  float distanceToEdge = roundedRectSdf(local, halfSize, radius);

  if (distanceToEdge > 0.0) {
    discard;
  }

  bool hasStroke = uHasStroke > 0.5;
  if (hasStroke && distanceToEdge >= -max(0.0, uStrokeThickness)) {
    outColor = uStrokeColor;
    return;
  }

  if (uFillEnabled > 0.5) {
    outColor = uFillColor;
    return;
  }

  discard;
}
