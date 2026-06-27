export interface Point {
  x: number;
  y: number;
}

/**
 * Ray-Casting-Algorithmus. Koordinaten sind normalisiert (0..1),
 * siehe Anforderungsdokument 17a.
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }
  return inside;
}

// Vorzeichenbehaftetes Kreuzprodukt (o→a) × (o→b)
function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// Liegt r (kollinear vorausgesetzt) auf Segment pq?
function onSegment(p: Point, q: Point, r: Point): boolean {
  return r.x >= Math.min(p.x, q.x) && r.x <= Math.max(p.x, q.x) &&
         r.y >= Math.min(p.y, q.y) && r.y <= Math.max(p.y, q.y);
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

/**
 * Prüft ob zwei Polygone sich überlappen (Kanten schneiden sich oder
 * eines liegt vollständig im anderen). Koordinaten normalisiert (0..1).
 */
export function polygonsIntersect(a: Point[], b: Point[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      if (segmentsIntersect(a1, a2, b[j], b[(j + 1) % b.length])) return true;
    }
  }
  if (isPointInPolygon(a[0], b)) return true;
  if (isPointInPolygon(b[0], a)) return true;
  return false;
}
