#version 300 es
precision mediump float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aCenter;
layout(location = 2) in vec2 aSizePx;
layout(location = 3) in float aRotation;
layout(location = 4) in vec2 aAnchor;
layout(location = 5) in vec2 aFlipScale;
layout(location = 6) in vec4 aUvRect;
layout(location = 7) in vec4 aTint;

uniform vec2 uViewport;

out vec2 vUv;
out vec4 vTint;

void main() {
  vec2 local = (aCorner - aAnchor) * aSizePx;
  vec2 flipped = local * aFlipScale;

  float c = cos(aRotation);
  float s = sin(aRotation);
  vec2 rotated = vec2(
    flipped.x * c - flipped.y * s,
    flipped.x * s + flipped.y * c
  );

  vec2 ndcOffset = vec2(
    (rotated.x / uViewport.x) * 2.0,
    -(rotated.y / uViewport.y) * 2.0
  );

  vec2 uvMin = aUvRect.xy;
  vec2 uvMax = aUvRect.zw;
  vUv = vec2(
    mix(uvMin.x, uvMax.x, aCorner.x),
    mix(uvMin.y, uvMax.y, aCorner.y)
  );
  vTint = aTint;
  gl_Position = vec4(aCenter + ndcOffset, 0.0, 1.0);
}