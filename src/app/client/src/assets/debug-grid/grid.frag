#version 300 es
precision highp float;

uniform float uRadius;
uniform vec4 uLineColor;
uniform vec2 uHoveredTile;
uniform float uHasHoveredTile;
uniform vec4 uHighlightColor;

in vec2 vWorldPosition;
out vec4 outColor;

void main() {
  const float SQRT_3 = 1.7320508;
  vec2 scaled = vWorldPosition / uRadius;
  float axialQ = 2.0 / 3.0 * scaled.x;
  float axialR = -1.0 / 3.0 * scaled.x + SQRT_3 / 3.0 * scaled.y;
  vec3 cube = vec3(axialQ, -axialQ - axialR, axialR);
  vec3 rounded = floor(cube + 0.5);
  vec3 difference = abs(rounded - cube);

  if (difference.x > difference.y && difference.x > difference.z) {
    rounded.x = -rounded.y - rounded.z;
  } else if (difference.y > difference.z) {
    rounded.y = -rounded.x - rounded.z;
  } else {
    rounded.z = -rounded.x - rounded.y;
  }

  vec2 center = uRadius * vec2(
    1.5 * rounded.x,
    SQRT_3 * (rounded.x * 0.5 + rounded.z)
  );
  vec2 local = (vWorldPosition - center) / uRadius;
  float hexBoundary = max(
    abs(local.y) / 0.8660254,
    abs(local.x) + abs(local.y) / SQRT_3
  );
  float edgeDistance = (1.0 - hexBoundary) * uRadius;
  const float LINE_WIDTH = 2.0;
  float antiAliasWidth = max(fwidth(edgeDistance), 0.001);
  float line = 1.0 - smoothstep(
    LINE_WIDTH * 0.5 - antiAliasWidth,
    LINE_WIDTH * 0.5 + antiAliasWidth,
    abs(edgeDistance)
  );

  bool isHovered = uHasHoveredTile > 0.5
    && rounded.x == uHoveredTile.x
    && rounded.z == uHoveredTile.y;
  vec4 lineColor = isHovered ? uHighlightColor : uLineColor;
  outColor = vec4(lineColor.rgb, lineColor.a * line);
}