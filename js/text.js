// All the words: kid-friendly move names, stage stories, and "tell me more".
import { COLOR_NAMES, applyMove, FACES } from './cube.js';

const C = (s, f) => s[FACES.indexOf(f) * 9 + 4];
const NAME = c => (COLOR_NAMES[c] || c).toUpperCase();

export function moveWords(move, state) {
  const base = move[0], kind = move.endsWith("'") ? 'prime' : move.endsWith('2') ? 'two' : 'cw';
  const W = {
    R: { cw: 'Turn the RIGHT side UP ⬆️ (away from you)', prime: 'Turn the RIGHT side DOWN ⬇️ (toward you)', two: 'Turn the RIGHT side TWICE (half a turn)' },
    L: { cw: 'Turn the LEFT side DOWN ⬇️ (toward you)', prime: 'Turn the LEFT side UP ⬆️ (away from you)', two: 'Turn the LEFT side TWICE (half a turn)' },
    U: { cw: 'Turn the TOP to the LEFT ⬅️', prime: 'Turn the TOP to the RIGHT ➡️', two: 'Turn the TOP TWICE (half a turn)' },
    D: { cw: 'Turn the BOTTOM to the RIGHT ➡️', prime: 'Turn the BOTTOM to the LEFT ⬅️', two: 'Turn the BOTTOM TWICE (half a turn)' },
    F: { cw: 'Turn the FRONT like a steering wheel to the RIGHT ↻', prime: 'Turn the FRONT like a steering wheel to the LEFT ↺', two: 'Turn the FRONT TWICE (half a turn)' },
    B: { cw: 'Turn the BACK side (its top goes LEFT)', prime: 'Turn the BACK side (its top goes RIGHT)', two: 'Turn the BACK side TWICE' },
  };
  if (base === 'y') {
    const after = applyMove(state, move);
    const col = NAME(C(after, 'F'));
    if (kind === 'two') return `Spin the WHOLE cube around 🔄 so ${col} faces you`;
    return `Turn the WHOLE cube to the ${kind === 'cw' ? 'LEFT ⬅️' : 'RIGHT ➡️'} so ${col} faces you`;
  }
  return W[base] ? W[base][kind] : move;
}

export const STAGE_TEXT = {
  daisy: {
    kid: 'First we make a flower! 🌼 We put the 4 white edge pieces around the yellow middle on top, like petals.',
    more: 'The "daisy" is an easy way to collect the white edges. Any white edge can be brought up to the top with one or two turns, and turning the top never knocks off a petal, so it\'s hard to mess up.',
    done: 'Beautiful daisy! 🌼',
  },
  cross: {
    kid: 'Now we move each petal down to the bottom. We match the petal\'s color with the middle of a side, then flip it down. That makes a white plus sign on the bottom! ➕',
    more: 'Each petal is an edge with white on top. Turning the top lines its side color up with the matching center; a half turn of the front then drops it to the bottom with white facing down. The result is the white cross with all side colors matched.',
    done: 'You made the white cross! ➕🎉',
  },
  corners: {
    kid: 'Next we put the 4 white corners in. Find a white corner on top, park it above its home, and do the Magic 4 until it pops in. ⬜',
    more: 'Each white corner belongs between two side colors. With the home spot at the front-right-bottom and the corner right above it, R U R\' U\' (repeated 1, 3 or 5 times) swaps the corner down and twists it until white faces down. It only disturbs the top layer, so the cross stays safe.',
    done: 'The whole white side is done! That\'s the first layer! ⭐',
  },
  middle: {
    kid: 'Time for the middle of the sandwich! 🥪 We slide 4 edges into the middle row, using a move that goes to the right or the left.',
    more: 'Find a top edge with no yellow. Line its front color up with the matching center, then look at its top color: if it matches the right side, use U R U\' R\' U\' F\' U F; if the left side, U\' L\' U L U F U\' F\'. Each slide takes the edge and corner out together, then puts them back together in the right spot. If an edge is stuck in the middle the wrong way, the same slide pops it out first.',
    done: 'Two layers done! You\'re more than halfway! 🥪🎉',
  },
  ycross: {
    kid: 'Now look at the yellow top. We want a yellow plus sign there! ⭐ The Star Maker adds yellow edges until we get it.',
    more: 'F R U R\' U\' F\' flips top-layer edges without touching the first two layers. Dot → L shape → line → cross. Hold the L in the back-left (like 9 o\'clock and 12 o\'clock) and the line side to side.',
    done: 'Yellow cross! ⭐🎉',
  },
  yedges: {
    kid: 'The yellow edges are up, but their side colors have to match the middles. The Fish move swims them into the right spots! 🐟',
    more: 'R U R\' U R U2 R\' (the "Sune") moves top edges around while keeping them yellow-up. It also scrambles the top corners, but we fix those next. Then a turn of the top lines everything up.',
    done: 'All the edges match! 🐟🎉',
  },
  ycorners: {
    kid: 'Now the yellow corners go to their homes. Each corner should sit between its own colors, even if it\'s twisted. The Corner Dance moves 3 corners around! 💃',
    more: 'U R U\' L\' U R\' U\' L swaps three corners in a circle and keeps the front-right-top corner where it is. Hold a corner that\'s already home at the front-right-top, and do it once or twice.',
    done: 'Every corner is home! Almost there! 💃',
  },
  yorient: {
    kid: 'Last step! Hold the cube still and twist each yellow corner with the Wiggle until yellow is on top. 🏆 The bottom will look messy for a bit. That\'s OK! It fixes itself at the end.',
    more: 'Keep the same side facing you the whole time. With an unsolved corner at front-right-top, repeat R\' D\' R D until its yellow is up (2 or 4 times). Then turn ONLY the top to bring the next twisted corner there. Don\'t turn the whole cube! The bottom layer gets mixed up in between, but the twists always add up so it comes back.',
    done: 'YOU SOLVED THE CUBE! 🏆🎉🎉',
  },
};

export const ALG_TEXT = {
  magic4: 'The Magic 4: Right up, top left, right down, top right. It lifts the corner out and tucks it back in. Keep doing it until the white corner pops into its home!',
  edgeRight: 'The Right Slide: this moves the edge out of the way, brings it down into the middle on the right, and puts its partner corner back. Nothing else gets messed up!',
  edgeLeft: 'The Left Slide: the same trick as the Right Slide, but like in a mirror. The edge slides down into the middle on the left.',
  star: 'The Star Maker: front, right, top, right back, top back, front back. It flips yellow edges up without hurting the bottom two layers.',
  fish: 'The Fish: it swims the top edges around so their colors match the sides.',
  swap: 'The Corner Dance: three corners trade places in a circle. The front-right corner stays put.',
  wiggle: 'The Wiggle: right down, bottom left, right up, bottom right. Each Wiggle twists the corner a little. Keep wiggling until yellow is on top!',
};

export function segmentIntro(seg, state) {
  const front = NAME(C(state, 'F'));
  switch (seg.kind) {
    case 'daisyPetal': return seg.petalCount === 1 ? 'Let\'s get the first white petal up to the top.' : `Petal number ${seg.petalCount}! Bring another white edge up next to the yellow middle.`;
    case 'petalDown': return `Move the petal with ${NAME(seg.color)} on its side. Turn the top until it's right above the ${NAME(seg.color)} middle, face that side, then turn the front twice.`;
    case 'cornerInsert': return 'Find a white corner on top. Put it right above its home, on the front-right.';
    case 'cornerPop': return 'Uh oh, a white corner is stuck on the bottom in the wrong place. We\'ll pop it up to the top first.';
    case 'edgeSetup': return `Find a top edge with no yellow. Line its color up with the middle under it. It wants to go ${seg.side === 'Right' ? 'RIGHT ➡️' : 'LEFT ⬅️'}.`;
    case 'edgePop': return 'An edge is stuck in the middle the wrong way. We\'ll pop it out first.';
    case 'ycrossSetup': return seg.shape === 'dot' ? 'Only a yellow dot? No problem, do the Star Maker.' : seg.shape === 'L' ? 'You have a yellow L! Hold it at the back-left, like a clock at 9 and 12.' : seg.shape === 'line' ? 'You have a yellow line! Hold it side to side.' : 'Get ready for the Star Maker.';
    case 'algSetup': return seg.forAlg === 'fish' ? 'Get the cube ready for the Fish.' : seg.homeFR ? 'Turn the whole cube so a corner that\'s already home is at the front-right-top.' : 'Get the cube ready for the Corner Dance.';
    case 'nextCorner': return 'Turn ONLY the top to bring the next twisted corner to the front-right. Keep holding the cube the same way!';
    case 'alignTop': return 'Turn the top to line everything up!';
    case 'alg': case 'magic4':
      if (seg.alg === 'swap') return ALG_TEXT.swap + (seg.homeFR ? ' The front-right-top corner is already home, so it stays put.' : ' No corner is home yet. After one dance, one will be!');
      if (seg.alg === 'magic4' && seg.pop) return 'Do the Magic 4 once to pop the stuck corner up to the top.';
      if (seg.alg === 'edgeRight' && seg.pop) return 'Do the Right Slide to pop the stuck edge out. Any top edge can go in for now.';
      return ALG_TEXT[seg.alg] || '';
  }
  return '';
}

export const holdWords = s => `Hold the cube with ${NAME(C(s, 'U'))} on top and ${NAME(C(s, 'F'))} facing you.`;
