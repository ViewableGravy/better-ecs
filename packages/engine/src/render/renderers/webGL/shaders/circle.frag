#version 300 es
precision mediump float;

in vec2 vUv;

uniform vec4 uFillColor;
uniform vec4 uStrokeColor;
uniform float uHasStroke;
uniform float uStrokeThickness;
uniform float uFillEnabled;
uniform float uArcEnabled;
uniform float uArcStart;
uniform float uArcEnd;
uniform float uArcDirection;

out vec4 outColor;

const float PI = 3.1415926535897932384626433832795;
const float TAU = PI * 2.0;

float normalizeAngle(float angle) {
  if (angle < 0.0) {
    angle += TAU;
  }

  if (angle >= TAU) {
    angle -= TAU;
  }

  return angle;
}

bool isAngleInArc(float angle, float arcStart, float arcEnd, float arcDirection) {
  float start = normalizeAngle(arcStart);
  float end = normalizeAngle(arcEnd);

  if (arcDirection >= 0.0) {
    float total = mod(end - start + TAU, TAU);
    float distance = mod(angle - start + TAU, TAU);
    return distance <= total;
  }

  float total = mod(start - end + TAU, TAU);
  float distance = mod(start - angle + TAU, TAU);
  return distance <= total;
}

void main() {
  vec2 centered = vUv * 2.0 - 1.0;
  float radius = length(centered);

  if (radius > 1.0) {
    discard;
  }

  bool inArc = true;
  if (uArcEnabled > 0.5) {
    float angle = normalizeAngle(atan(centered.y, centered.x));
    inArc = isAngleInArc(angle, uArcStart, uArcEnd, uArcDirection);
  }

  if (!inArc) {
    discard;
  }

  bool hasStroke = uHasStroke > 0.5;
  bool strokePass = false;
  if (hasStroke) {
    float innerRadius = max(0.0, 1.0 - max(0.0, uStrokeThickness));
    strokePass = radius >= innerRadius;
  }

  if (strokePass) {
    outColor = uStrokeColor;
    return;
  }

  if (uFillEnabled > 0.5) {
    outColor = uFillColor;
    return;
  }

  discard;
}