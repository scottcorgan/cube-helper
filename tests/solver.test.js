import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedState, applyMoves, isSolved, randomScramble } from '../js/cube.js';
import { solve, goals, STAGES, ALGS } from '../js/solver.js';
import { rng } from './helpers.js';

const N = 1000;
test(`solver solves ${N} random scrambles and every stage hits its goal`, () => {
  const r = rng(2026);
  let total = 0, max = 0;
  for (let n = 0; n < N; n++) {
    const sc = randomScramble(20 + Math.floor(r() * 15), r);
    const start = applyMoves(solvedState(), sc);
    const res = solve(start);
    assert.equal(res.stages.length, STAGES.length);
    let s = res.start;
    res.stages.forEach((st, i) => {
      assert.equal(st.key, STAGES[i].key);
      for (const seg of st.segments) for (const m of seg.moves) {
        assert.deepEqual(m.before, s, 'recorded "before" state matches');
        s = applyMoves(s, [m.move]);
      }
      assert.ok(goals[st.key](s), `scramble ${n}: stage ${st.key} goal not reached`);
    });
    assert.ok(isSolved(s));
    assert.ok(isSolved(applyMoves(res.start, res.moves)), 'flat move list solves the cube');
    total += res.moves.length; max = Math.max(max, res.moves.length);
  }
  console.log(`  average ${(total / N).toFixed(1)} moves, max ${max}`);
});

test('algorithms are only the standard beginner ones', () => {
  const r = rng(7);
  for (let n = 0; n < 50; n++) {
    const res = solve(applyMoves(solvedState(), randomScramble(25, r)));
    for (const st of res.stages) for (const seg of st.segments) {
      if (seg.alg) assert.deepEqual(seg.moves.map(m => m.move), ALGS[seg.alg].moves);
      else assert.ok(seg.moves.length <= 6, 'setup segments are short');
      for (const m of seg.moves) assert.ok(!m.move.startsWith('B'), 'never asks for a back turn');
    }
  }
});

test('solves an already solved cube and a cube held with white on top', () => {
  assert.equal(solve(solvedState()).moves.length, 0);
  const tilted = applyMoves(applyMoves(solvedState(), "R U F' L2 D B"), 'x2');
  const res = solve(tilted);
  assert.equal(res.start[31], 'W');
  assert.ok(isSolved(applyMoves(res.start, res.moves)));
});
