precision mediump float;

varying float vDistance;
varying vec3 vColor;
varying float vWeight;

void main() {
  vec3 base = vColor;
  float gray = dot(base, vec3(0.299, 0.587, 0.114));
  float saturation = mix(0.4, 1.6, vWeight);
  vec3 saturated = mix(vec3(gray), base, saturation);
  float brightness = mix(0.6, 1.3, vWeight);
  vec3 color = saturated * brightness;
  float strength = distance(gl_PointCoord, vec2(0.5));
  strength = 1.0 - strength;
  strength = pow(strength, 3.0);

  color = mix(color, vec3(0.97, 0.70, 0.45), vDistance * 0.5);
  color = mix(vec3(0.0), color, strength);
  gl_FragColor = vec4(color, strength);
}
