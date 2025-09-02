uniform float uTime;
uniform float uRadius;
uniform float uWeights[4];
uniform vec3 uColors[4];

attribute float aPillarId;

varying float vDistance;
varying vec3 vColor;
varying float vWeight;

mat3 rotation3dY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(
    c, 0.0, -s,
    0.0, 1.0, 0.0,
    s, 0.0, c
  );
}

void main() {
  float distanceFactor = pow(uRadius - distance(position, vec3(0.0)), 1.5);
  float w = uWeights[int(aPillarId)];
  vWeight = w;
  float scale = mix(0.5, 5.0, w);
  float size = (4.0 + distanceFactor * 4.0) * scale;

  vec3 particlePosition = position * rotation3dY(uTime * 0.3 * (0.4 + distanceFactor * (0.6 + 0.8 * w)));

  vDistance = distanceFactor;
  vColor = uColors[int(aPillarId)];

  vec4 modelPosition = modelMatrix * vec4(particlePosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  gl_PointSize = size;
  gl_PointSize *= (1.0 / - viewPosition.z);
}
