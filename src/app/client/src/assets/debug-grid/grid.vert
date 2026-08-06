#version 300 es
precision mediump float;

layout(location = 0) in vec2 aCorner;

uniform vec2 uViewport;
uniform vec2 uCameraPosition;
uniform float uCameraZoom;

out vec2 vWorldPosition;

void main() {
  vec2 worldPosition = uCameraPosition + vec2(
    aCorner.x * uViewport.x / (2.0 * uCameraZoom),
    -aCorner.y * uViewport.y / (2.0 * uCameraZoom)
  );
  vec2 centered = worldPosition - uCameraPosition;
  vec2 ndc = vec2(
    centered.x * uCameraZoom / uViewport.x * 2.0,
    -centered.y * uCameraZoom / uViewport.y * 2.0
  );

  vWorldPosition = worldPosition;
  gl_Position = vec4(ndc, 0.0, 1.0);
}