import test from 'node:test';
import assert from 'node:assert/strict';
import { cellAtPoint, clamp } from '../src/components/boardGeometry.ts';

test('all 225 cells map correctly at phone and tablet widths, with zoom and pan', () => {
  for (const size of [292, 347, 402, 652]) for (const scale of [1, 1.5, 3]) {
    const limit = size * (scale - 1) / 2;
    for (const offset of [-limit, 0, limit]) for (let i = 0; i < 225; i++) {
      const px = ((i % 15 + 0.5) * size / 15 - size / 2) * scale + size / 2 + offset;
      const py = ((Math.floor(i / 15) + 0.5) * size / 15 - size / 2) * scale + size / 2 - offset;
      assert.equal(cellAtPoint(px, py, size, scale, offset, -offset), i);
    }
  }
});
test('outer edges do not wrap to another row and scale remains bounded', () => {
  assert.equal(cellAtPoint(300, 0, 300, 1, 0, 0), -1);
  assert.equal(cellAtPoint(-1, 20, 300, 1, 0, 0), -1);
  assert.equal(cellAtPoint(20, 300, 300, 1, 0, 0), -1);
  assert.equal(cellAtPoint(0, 0, 300, 1, 0, 0), 0);
  assert.equal(clamp(0.2, 1, 3), 1); assert.equal(clamp(5, 1, 3), 3);
});
