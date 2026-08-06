#version 300 es
precision mediump float;

uniform float uRadius;
uniform vec4 uLineColor;

in vec2 vWorldPosition;
out vec4 outColor;

void main() {
  const float SQRT_3 = 1.7320508;
  vec2 scaled = vWorldPosition / uRadius;
  float axialQ = SQRT_3 / 3.0 * scaled.x - 1.0 / 3.0 * scaled.y;
  float axialR = 2.0 / 3.0 * scaled.y;
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
    SQRT_3 * (rounded.x + rounded.z * 0.5),
    1.5 * rounded.z
  );
  vec2 local = (vWorldPosition - center) / uRadius;
  float edgeDistance = 1.0 - max(
    abs(local.y),
    max(abs(0.8660254 * local.x + 0.5 * local.y), abs(0.8660254 * local.x - 0.5 * local.y))
  );
  float line = 1.0 - smoothstep(0.0, max(fwidth(edgeDistance) * 1.5, 0.018), edgeDistance);

  outColor = vec4(uLineColor.rgb, uLineColor.a * line);
}