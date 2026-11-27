// Engineering coordinates in millimetres: X across the sheet, Y above HP,
// Z in front of VP. In first-angle drawings plan depth runs down the sheet.
export const add = (a, b) => a.map((value, i) => value + b[i]);
export const sub = (a, b) => a.map((value, i) => value - b[i]);
export const scale = (a, factor) => a.map(value => value * factor);
export const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
export const cross = ([x,y,z], [a,b,c]) => [y*c-z*b, z*a-x*c, x*b-y*a];
export const length = a => Math.hypot(...a);
export const unit = a => scale(a, 1 / length(a));
export const mix = (a, b, t) => add(a, scale(sub(b, a), t));
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const HP = [0, 1, 0];
export const VP = [0, 0, 1];
const X = [1, 0, 0];
const EPS = 1e-9;
const degrees = radians => radians * 180 / Math.PI;
const lineInclination = (line, planeNormal) => degrees(Math.asin(clamp(Math.abs(dot(unit(line), planeNormal)), 0, 1)));
export const formatNumber = value => Number(value.toFixed(2)).toString();

const PYRAMID_FACES = ['abcd','abo','bco','cdo','dao'];
const CUBE_FACES = ['abcd','1234','ab21','bc32','cd43','da14'];

function solid(points, faces, depth, axis, contact, details) {
  const physicalNames = [...new Set(faces.join(''))];
  const physicalPoints = physicalNames.map(name => points[name]);
  const min = X.map((_, i) => Math.min(...physicalPoints.map(p => p[i])));
  const max = X.map((_, i) => Math.max(...physicalPoints.map(p => p[i])));
  const shift = [0, -min[1], depth - (min[2] + max[2]) / 2];
  const vertices = Object.fromEntries(Object.entries(points).map(([key, coordinates]) => [
    key, add(coordinates, shift).map(value => Math.abs(value) < EPS ? 0 : value),
  ]));
  const centre = add(mix(min, max, .5), shift);
  const interior = add(shift, scale(physicalPoints.reduce(add), 1 / physicalPoints.length));
  const faceData = faces.map(names => {
    const [a, b, c] = [...names].map(name => vertices[name]);
    const normal = unit(cross(sub(b, a), sub(c, a)));
    return { names, normal: dot(normal, sub(a, interior)) >= 0 ? normal : scale(normal, -1) };
  });
  const edges = new Map();
  faceData.forEach(({names}, face) => [...names].forEach((a, i) => {
    const b = names[(i + 1) % names.length];
    const key = [a,b].sort().join('');
    if (!edges.has(key)) edges.set(key, {a, b, key, faces: []});
    edges.get(key).faces.push(face);
  }));
  const direction = sub(vertices[axis[1]], vertices[axis[0]]);
  return {
    vertices, physicalNames, centre,
    faces: faceData, edges: [...edges.values()], axis, contact,
    hpAngle: lineInclination(direction, HP), vpAngle: lineInclination(direction, VP),
    ...details,
  };
}

function squarePyramid(restsOnSlantEdge) {
  const side = 30, altitude = 60;
  const h = side / 2;
  const halfDiagonal = side / Math.SQRT2;
  const plan = restsOnSlantEdge
    ? [[-halfDiagonal,0],[0,halfDiagonal],[halfDiagonal,0],[0,-halfDiagonal]]
    : [[-h,-h],[-h,h],[h,h],[h,-h]];
  // Rotate around the depth direction, leaving the axis parallel to VP.
  const angle = restsOnSlantEdge
    ? Math.PI - Math.atan2(altitude, halfDiagonal)
    : Math.atan2(h, altitude);
  const rotate = (x, y, z) => [
    x * Math.cos(angle) + y * Math.sin(angle),
    y * Math.cos(angle) - x * Math.sin(angle),
    z,
  ];
  const points = Object.fromEntries(plan.map(([x,z], i) => ['abcd'[i], rotate(x,0,z)]));
  points.p = rotate(0,0,0);
  points.o = rotate(0,altitude,0);
  return solid(points, PYRAMID_FACES, restsOnSlantEdge ? 122 / 3 : 30, ['p','o'],
    restsOnSlantEdge ? ['c','o'] : ['c','d'], {
      dimensions: [
        {ends:['a','b'], offset:restsOnSlantEdge ? [-6,4,5] : [-7,5,0], label:'30 mm'},
        {ends:['p','o'], offset:[0,4,-9], label:'60 mm'},
      ],
      dimensionText:'30 mm base side · 60 mm altitude',
      axisName:'Axis',
      contactText: restsOnSlantEdge ? 'Slant edge c–o on HP' : 'Base edge c–d on HP and perpendicular to VP',
      extraText: restsOnSlantEdge ? '' : 'Triangular face c–d–o at 90° to HP and VP',
      angleGuides: [
        {origin: 'p', u: X, v: unit(sub(points.o, points.p)), radius: 15},
        ...(!restsOnSlantEdge ? [
          {origin: 'c', u: scale(X,-1), v: HP, radius: 9},
        ] : []),
      ],
    });
}

function cornerCube() {
  const side = 40;
  // These three equal, perpendicular vectors point out of the lower corner 1.
  const x = side / Math.sqrt(6), y = side / Math.sqrt(3), z = side / Math.SQRT2;
  return cubeFromCorner({
    side, depth:44, corner:'1', u:[x,y,z], w:[x,y,-z], h:[-2*x,y,0],
    axis:['1','c'], contactText:'Corner 1 on HP',
    angleGuides:[{origin:'1', u:X, v:HP, radius:12}],
  });
}

function horizontalDiagonalCube({side, diagonal, depth}) {
  const x = side / Math.SQRT2, y = side / Math.sqrt(6), z = side / Math.sqrt(3);
  return cubeFromCorner({
    side, diagonal, depth, corner:'3', u:[x,y,z], w:[-x,y,z], h:[0,2*y,-z],
    axis:['c','1'], contactText:'Corner 3 on HP',
    angleGuides:[{origin:'c', u:X, v:VP, radius:12}],
  });
}

function cubeFromCorner({side, diagonal, depth, corner, u, w, h, axis, contactText, angleGuides}) {
  const opposite = corner === '1' ? '3' : '1';
  const points = {[corner]:[0,0,0], '2':u, '4':w, [opposite]:add(u,w)};
  [...'abcd'].forEach((name,i) => { points[name] = add(points[i+1],h); });
  const dimensions = [{ends:['a','b'], offset:[0,7,3], label:diagonal ? '20√3 mm' : '40 mm'}];
  if (diagonal) dimensions.push({ends:axis, offset:[9,4,0], label:'60 mm'});
  return solid(points, CUBE_FACES, depth, axis, [corner], {
    dimensions,
    dimensionText:diagonal ? '60 mm solid diagonal · 20√3 mm (≈34.64 mm) edge' : '40 mm edges',
    axisName:'Solid diagonal',
    contactText,
    angleGuides,
  });
}

export const models = new Map([
  ['II:1', { name:'Square pyramid on a slant edge', build:() => squarePyramid(true) }],
  ['II:2', { name:'Square pyramid on a base edge', build:() => squarePyramid(false) }],
  ['II:3', { name:'Cube on a corner, vertical diagonal', build:cornerCube }],
  ['II:4', { name:'40 mm cube with a horizontal diagonal', build:() => horizontalDiagonalCube({side:40, depth:44}) }],
  ['II:5', { name:'Cube with a 60 mm horizontal diagonal', build:() => horizontalDiagonalCube({side:60 / Math.sqrt(3), diagonal:60, depth:38}) }],
]);
