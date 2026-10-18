/* 難易度とグリッドの共通計算。ブラウザとNodeで同じ関数を使用する。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReidolDifficulty = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // MODEL BEGIN — PythonもこのJSONだけを読み込む。重みの変更先はここ一か所。
  const MODEL = {"version":1,"base":1,"range":14,"avgScale":5,"peakScale":7,"jumpScale":2,"phaseTolerance":0.08,"chordTolerance":0.001,"weights":{"avg":0.45,"peak":0.35,"chord":0.03,"offbeat":0.05,"fine":0.10,"jump":0.02,"hold":0.02}};
  // MODEL END
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const round6 = x => Math.floor(x * 1e6 + 0.5) / 1e6;
  function validate(notes, lanes, duration) {
    if (!Array.isArray(notes) || ![3, 5].includes(lanes) || !Number.isFinite(duration) || duration <= 0) throw new Error('譜面または曲の長さが不正です');
    for (const n of notes) {
      if (!n || !Number.isFinite(n.t) || n.t < 0 || n.t > duration || !Number.isInteger(n.l) || n.l < 0 || n.l >= lanes) throw new Error('ノーツの時刻・レーンが不正です');
      if (n.type !== undefined && !['tap', 'hold', 'flick'].includes(n.type)) throw new Error('未対応のノーツ種別です');
      if (n.type === 'hold' && (!Number.isFinite(n.d) || n.d <= 0 || n.t + n.d > duration + 1e-6)) throw new Error('長押しの長さが不正です');
      if (n.type === 'flick' && ![-1, 1].includes(n.dir)) throw new Error('フリックの向きが不正です');
    }
    return notes;
  }
  function evaluate(notes, options) {
    const { duration, bpm, offset = 0, lanes = 3 } = options;
    validate(notes, lanes, duration);
    if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(offset)) throw new Error('BPMまたはoffsetが不正です');
    const ns = [...notes].sort((a, b) => a.t - b.t || a.l - b.l), count = ns.length, groups = [];
    let off = 0, fine = 0, holds = 0, peak = 0, left = 0;
    for (let i = 0; i < count; i++) {
      const n = ns[i], phase = ((n.t - offset) * bpm / 60 % 1 + 1) % 1;
      if (Math.abs(phase - .5) <= MODEL.phaseTolerance) off++;
      if (Math.min(phase, Math.abs(phase - .5), 1 - phase) > MODEL.phaseTolerance) fine++;
      if (n.type === 'hold') holds++;
      while (n.t - ns[left].t >= 5 - 1e-9) left++;
      peak = Math.max(peak, i - left + 1);
      const last = groups[groups.length - 1];
      if (last && Math.abs(n.t - last.t) <= MODEL.chordTolerance) { last.sum += n.l; last.n++; }
      else groups.push({ t: n.t, sum: n.l, n: 1 });
    }
    let chord = 0, jump = 0;
    groups.forEach((g, i) => { if (g.n > 1) chord += g.n; if (i) jump += Math.abs(g.sum / g.n - groups[i - 1].sum / groups[i - 1].n); });
    const m = { notes: count, avgDensity: count / duration, maxDensity5: peak / Math.min(5, duration), simultaneousRatio: count ? chord / count : 0, offbeatRatio: count ? off / count : 0, sixteenthRatio: count ? fine / count : 0, laneJump: groups.length > 1 ? jump / (groups.length - 1) : 0, holdCount: holds };
    const w = MODEL.weights;
    const raw = w.avg * clamp(m.avgDensity / MODEL.avgScale, 0, 1) + w.peak * clamp(m.maxDensity5 / MODEL.peakScale, 0, 1) + w.chord * m.simultaneousRatio + w.offbeat * m.offbeatRatio + w.fine * m.sixteenthRatio + w.jump * clamp(m.laneJump / MODEL.jumpScale, 0, 1) + w.hold * (count ? holds / count : 0);
    const level = count ? clamp(Math.floor(MODEL.base + MODEL.range * raw + .5), 1, 15) : 1;
    return Object.fromEntries(Object.entries({ level, ...m }).map(([k, v]) => [k, round6(v)]));
  }
  function nearest(t, bpm, offset, division) {
    const step = 240 / bpm / division;
    return round6(offset + Math.floor((t - offset) / step + .5) * step);
  }
  function fit(notes, { bpm, offset, division, tolerance, duration }) {
    return notes.map(n => {
      const t = nearest(n.t, bpm, offset, division);
      return Math.abs(t - n.t) <= tolerance + 1e-9 && t >= 0 && t <= duration ? { ...n, t } : { ...n };
    });
  }
  return { MODEL, evaluate, validate, nearest, fit };
});
