import {add, clamp, cross, dot, length, mix, scale, sub} from './models.mjs';

const EPS = 1e-7;
const radians = value => value * Math.PI / 180;

export const views = {
  iso: [radians(35), radians(27)],
  front: [0,0],
  top: [0,Math.PI / 2],
  right: [Math.PI / 2,0],
};

export function viewBasis(azimuth, elevation) {
  const cos = Math.cos(elevation);
  const right = [Math.cos(azimuth), 0, -Math.sin(azimuth)];
  const towardViewer = [Math.sin(azimuth)*cos, Math.sin(elevation), Math.cos(azimuth)*cos];
  return {right, up:cross(towardViewer,right), towardViewer};
}

export function planeXY(point, basis) {
  return [dot(point,basis.right), -dot(point,basis.up)];
}

function covers(segment, other) {
  const start = sub(other.a, segment.a);
  const end = sub(other.b, segment.a);
  const direction = sub(segment.b, segment.a);
  const [dx,dy] = direction;
  if (Math.abs(start[0]*dy - start[1]*dx) > EPS || Math.abs(end[0]*dy - end[1]*dx) > EPS) return [];
  const square = dot(direction,direction);
  return [dot(start,direction)/square, dot(end,direction)/square].sort((a,b) => a-b);
}

// Engineering line precedence applies only where projected strokes overlap.
// A visible edge masks a hidden edge or centreline over the coincident portion.
function clipCoincident(segment, higher) {
  let open = [[0,1]];
  for (const other of higher) {
    const [low, high] = covers(segment,other);
    if (low === undefined || high <= 0 || low >= 1) continue;
    open = open.flatMap(([from,to]) => {
      if (from >= high || to <= low) return [[from,to]];
      return [[from,Math.max(from,low)],[Math.min(to,high),to]].filter(([a,b]) => b-a > EPS);
    });
  }
  return open.map(([from,to]) => ({...segment, a:mix(segment.a,segment.b,from), b:mix(segment.a,segment.b,to)}));
}

export function projectSolid(model,basis) {
  const points = Object.fromEntries(Object.entries(model.vertices).map(([key,p]) => [key,planeXY(p,basis)]));
  const facing = model.faces.map(face => dot(face.normal,basis.towardViewer));
  const visibleFaces = model.faces.filter((_,i) => facing[i] > EPS);
  const contact = model.contact.length === 2 ? [...model.contact].sort().join('') : null;
  const edges = model.edges.map(edge => ({
    a:points[edge.a], b:points[edge.b], key:edge.key,
    hidden:edge.faces.every(i => facing[i] <= EPS),
    contact:edge.key === contact,
  })).filter(line => length(sub(line.b,line.a)) > EPS);
  const visible = [], hidden = [];
  for (const edge of edges.filter(edge => !edge.hidden)) visible.push(...clipCoincident(edge,visible));
  for (const edge of edges.filter(edge => edge.hidden)) hidden.push(...clipCoincident(edge,[...visible,...hidden]));
  const axis = {a:points[model.axis[0]], b:points[model.axis[1]]};
  return {
    points, visibleFaces, visible, hidden,
    centreLine:length(sub(axis.b,axis.a)) > EPS ? clipCoincident(axis,[...visible,...hidden]) : [],
  };
}

export function arcFromRays(origin, u, v, radius) {
  const cosine = clamp(dot(u,v), -1, 1);
  const angle = Math.acos(cosine);
  if (angle < EPS || Math.PI-angle < EPS) return null;
  const w = scale(sub(v,scale(u,cosine)),1 / Math.sin(angle));
  const at = theta => add(origin, add(scale(u,radius*Math.cos(theta)), scale(w,radius*Math.sin(theta))));
  return {points:Array.from({length:25}, (_,i) => at(angle*i/24)), middle:at(angle/2), degrees:angle*180/Math.PI};
}
