#version 300 es
precision highp float;

uniform float uRadius;
uniform float uChunkScale;
uniform vec4 uLineColor;
uniform vec2 uHoveredTile;
uniform float uHasHoveredTile;
uniform vec4 uHighlightColor;

in vec2 vWorldPosition;
out vec4 outColor;

float getHexLine(vec2 worldPosition, float radius, float lineWidth) {
  const float SQRT_3 = 1.7320508;
  vec2 scaled = worldPosition / radius;
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

  vec2 center = radius * vec2(
    1.5 * rounded.x,
    SQRT_3 * (rounded.x * 0.5 + rounded.z)
  );
  vec2 local = (worldPosition - center) / radius;
  float hexBoundary = max(
    abs(local.y) / 0.8660254,
    abs(local.x) + abs(local.y) / SQRT_3
  );
  float edgeDistance = (1.0 - hexBoundary) * radius;
  float antiAliasWidth = max(fwidth(edgeDistance), 0.001);

  return 1.0 - smoothstep(
    lineWidth * 0.5 - antiAliasWidth,
    lineWidth * 0.5 + antiAliasWidth,
    abs(edgeDistance)
  );
}

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

  const float LINE_WIDTH = 2.0;
  float line = getHexLine(vWorldPosition, uRadius, LINE_WIDTH);
  float chunkLine = getHexLine(vWorldPosition, uRadius * uChunkScale, LINE_WIDTH * 0.5);

  bool isHovered = uHasHoveredTile > 0.5
    && rounded.x == uHoveredTile.x
    && rounded.z == uHoveredTile.y;
  vec4 lineColor = isHovered ? uHighlightColor : uLineColor;
  vec4 chunkColor = vec4(1.0, 1.0, 0.0, 0.5);
  vec3 visibleColor = mix(lineColor.rgb, chunkColor.rgb, chunkLine);
  float visibleAlpha = max(line * lineColor.a, chunkLine * chunkColor.a);
  outColor = vec4(visibleColor, visibleAlpha);
}