// Pure game rules. R = red (host / you vs CPU), Y = yellow (guest / CPU).
export const other = t => (t === 'R' ? 'Y' : 'R')

export function shuffle(a) {
  a = a.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function newGame() {
  return {
    slots: shuffle([...Array(6).fill('R'), ...Array(6).fill('Y')]).map(c => ({ c, rev: false })),
    score: { R: 0, Y: 0 }, shakes: { R: 1, Y: 1 },
    turn: 'R', phase: 'pick', msg: 'Red starts. Pull your colour!', winner: null, seq: 0, last: null,
  }
}

// What players may see: hidden colours never leave the host.
export function publicState(S) {
  return {
    slots: S.slots.map(b => (b ? { rev: b.rev, c: b.rev ? b.c : null } : null)),
    score: { ...S.score }, shakes: { ...S.shakes }, turn: S.turn, phase: S.phase,
    msg: S.msg, winner: S.winner, seq: S.seq, last: S.last,
  }
}

// Mutates S. Returns true if the action was legal.
export function applyAction(S, team, a, i) {
  if (!S || S.winner || S.turn !== team) return false
  const o = other(team), who = team === 'R' ? 'Red' : 'Yellow'
  if (a === 'pull' && S.phase === 'pick') {
    const b = S.slots[i]
    if (!b) return false
    if (b.c === team) {
      S.slots[i] = null; S.score[team]++; S.last = { t: 'pull', i, team, c: b.c, ok: true }; S.msg = `${who} pulled a match!`
      if (S.score[team] >= 6) S.winner = team; else S.turn = o
    } else {
      b.rev = true; S.last = { t: 'pull', i, team, c: b.c, ok: false }; S.msg = `${who} exposed a ${b.c === 'R' ? 'red' : 'yellow'} ball!`
      if (S.shakes[team] > 0) S.phase = 'shake'; else S.turn = o
    }
  } else if (a === 'shake' && S.phase === 'shake' && S.shakes[team] > 0) {
    S.shakes[team]--; S.last = { t: 'shake', team }
    const live = S.slots.filter(Boolean); live.forEach(b => (b.rev = false))
    const pos = shuffle([...Array(12).keys()]); S.slots = Array(12).fill(null)
    live.forEach((b, k) => (S.slots[pos[k]] = b))
    S.phase = 'pick'; S.turn = o; S.msg = `${who} shook the box. Everything is hidden!`
  } else if (a === 'skip' && S.phase === 'shake') {
    S.phase = 'pick'; S.turn = o; S.last = { t: 'skip', team }; S.msg = `${who} kept the shake.`
  } else return false
  S.seq++
  return true
}

// CPU: remembers exposed balls, takes any exposed yellow, otherwise guesses a hidden slot.
export function cpuChoose(S) {
  if (S.phase === 'shake') return { a: Math.random() < 0.65 ? 'shake' : 'skip' }
  const live = S.slots.map((b, i) => (b ? i : -1)).filter(i => i >= 0)
  const known = live.filter(i => S.slots[i].rev && S.slots[i].c === 'Y')
  const hidden = live.filter(i => !S.slots[i].rev)
  const pool = known.length ? known : hidden.length ? hidden : live
  return { a: 'pull', i: pool[(Math.random() * pool.length) | 0] }
}

// Rough duration of the animation a move triggers (the CPU waits this long before acting)
export function animMs(last) {
  if (!last) return 0
  if (last.t === 'pull') return last.ok ? 2900 : 2500
  return last.t === 'shake' ? 700 : 0
}
