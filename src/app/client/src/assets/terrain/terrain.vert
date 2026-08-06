#version 300 es
precision mediump float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aCenter;
layout(location = 2) in vec2 aSize;
layout(location = 3) in vec4 aColor;

uniform vec2 uViewport;
uniform vec2 uCameraPosition;
uniform float uCameraZoom;

out vec2 vLocal;
out vec4 vColor;

void main() {
  vec2 worldPosition = aCenter + (aCorner - 0.5) * aSize;
  vec2 centered = worldPosition - uCameraPosition;
  vec2 ndc = vec2(
    centered.x * uCameraZoom / uViewport.x * 2.0,
    -centered.y * uCameraZoom / uViewport.y * 2.0
  );
  vLocal = (aCorner - 0.5) * 2.0;
  vColor = aColor;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
