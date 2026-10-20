/**
 * Cobogó: a side table in five groups (glass, four pads, a perforated
 * concrete top, four legs with their inserts, a steel stretcher frame), shown
 * as an exploded view. The pointer's x scrubs the assembly: far left is fully
 * exploded, the legs spreading out and the top lifting off; far right is the
 * table standing whole. Its y picks a part, which takes the bright stroke. At
 * rest it hangs half exploded, the top bright. The slider is the gap.
 *
 * The pattern: scrub and pick. One spring for the assembly, a pick on static
 * screen bands taken from the rest pose, so a part moving cannot flip it.
 */
const {
  Cam, clamp, facing, fit, open, poly, prism, proj, rings, ringAt, rrect, run, seg, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const W = 60, LH = 72, ST = 10, PAD = 2, GT = 1.6, LW = 13, LI = 2.5, FZ = 20, FT = 2.6;
const REST = 0.7, GMAX = 36;
// how far each group travels per unit of gap: [dx·dy outwards for legs, dz]
const K = { frame: -0.9, slab: 0.8, pads: 1.15, glass: 1.5, spread: 0.6 };
const PARTS = ["glass", "pads", "top", "legs", "frame"];

/** Twelve slots in a pinwheel: two quadrants run along x, two along y. */
function slots() {
  const out = [];
  [[6, 6, 0], [31, 6, 1], [6, 31, 1], [31, 31, 0]].forEach(([qx, qy, o]) => {
    for (let s = 0; s < 3; s++) {
      const a = 2 + s * 7.5, b = a + 4.6;
      out.push(o ? [qx + a, qy + 1.5, qx + b, qy + 21.5] : [qx + 1.5, qy + a, qx + 21.5, qy + b]);
    }
  });
  return out;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gap = value;

  const C = Cam(45, 0.5, 1.55);
  const sp = GMAX * K.spread, ext = [];
  for (const [x, y] of [[-sp, -sp], [W + sp, -sp], [-sp, W + sp], [W + sp, W + sp]]) ext.push([x, y, FZ + K.frame * GMAX], [x, y, 0]);
  for (const [x, y] of [[0, 0], [W, 0], [0, W], [W, W]]) ext.push([x, y, LH + ST + PAD + GT + K.glass * GMAX]);
  fit(C, ext, 200, 164);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // dashed guides on the four leg axes, painted first so every solid covers them
  const guide = mk("path", { class: "nf dash" }, g);

  // legs, frame tubes, in paint order from the far corner
  const c0 = LI + LW / 2, c1 = W - LI - LW / 2;
  const legAt = (sx, sy) => ({ sx, sy, el: solid(g), ins: solid(g) });
  const tubeAt = (x0, y0, x1, y1) => ({ r: rings(x0, y0, x1, y1, 0.9, 0.5), el: solid(g) });
  const t0 = LI + LW, t1 = W - LI - LW, h = FT / 2;
  const legs = [], tubes = [];
  legs.push(legAt(-1, -1));
  tubes.push(tubeAt(t0, c0 - h, t1, c0 + h), tubeAt(c0 - h, t0, c0 + h, t1));
  legs.push(legAt(1, -1), legAt(-1, 1));
  tubes.push(tubeAt(t0, c1 - h, t1, c1 + h), tubeAt(c1 - h, t0, c1 + h, t1));
  legs.push(legAt(1, 1));

  const slab = solid(g), holes = mk("path", { class: "nf lo" }, g), walls = mk("path", { class: "nf lo" }, g);
  const pads = [[3, 3], [W - 3, 3], [3, W - 3], [W - 3, W - 3]].map((q) => ({ q, el: flatDot(g, C, 1.3, "dot m") }));
  const glass = solid(g), edge = mk("path", { class: "nf lo" }, g);
  glass.sil.classList.add("nf");

  const [sr, si] = rings(0, 0, W, W, 4, 1.6);
  const [gr, gi] = rings(-1, -1, W + 1, W + 1, 4, 0.8);
  const slot = slots().map(([a, b, c, d]) => rrect(a, b, c, d, 1.6, 3));
  const sides = { "-1": [LI, LI + LW], 1: [W - LI - LW, W - LI] };

  /** Every part's height and spread at assembly e (0 whole, 1 fully apart). */
  const at = (e) => ({ fz: FZ + K.frame * gap * e, sz: LH + K.slab * gap * e, pz: LH + ST + K.pads * gap * e, gz: LH + ST + PAD + K.glass * gap * e, s: K.spread * gap * e });

  let drawn = NaN;
  function draw(e) {
    if (e === drawn) return;
    drawn = e;
    const { fz, sz, pz, gz, s } = at(e);
    let gd = "";
    for (const L of legs) {
      const [x0, x1] = sides[L.sx], [y0, y1] = sides[L.sy], dx = L.sx * s, dy = L.sy * s;
      const [r, i] = rings(x0 + dx, y0 + dy, x1 + dx, y1 + dy, 5, 1.4);
      put(L.el, prism(P, front, r, i, 0, LH));
      const mx = (x0 + x1) / 2 + dx, my = (y0 + y1) / 2 + dy;
      const [ir, ii] = rings(mx - 4, my - 3, mx + 4, my + 3, 1, 0.7);
      put(L.ins, prism(P, front, ir, ii, LH, LH + 4));
      gd += seg(P(mx, my, fz), P(mx, my, sz));
    }
    guide.setAttribute("d", gd);
    for (const t of tubes) put(t.el, prism(P, front, t.r[0], t.r[1], fz, fz + FT));
    put(slab, prism(P, front, sr, si, sz, sz + ST));
    holes.setAttribute("d", slot.map((r) => poly(ringAt(P, r, sz + ST))).join(""));
    walls.setAttribute("d", slot.map((r) => open(ringAt(P, run(r, (q) => q.nu < 0 || q.nv < 0), sz + ST - 3))).join(""));
    pads.forEach((p) => place(p.el, P(p.q[0], p.q[1], pz + PAD)));
    put(glass, prism(P, front, gr, gi, gz, gz + GT));
    edge.setAttribute("d", open(ringAt(P, run(gr, (q) => q.nu > 0 || q.nv > 0), gz + GT * 0.45)));
  }

  // picking bands: each part's centre on screen in the REST pose; they never move
  const rp = at(REST), mid = W / 2;
  const bands = [rp.gz + 1, rp.pz + 1, rp.sz + ST / 2, LH / 2, rp.fz].map((z) => P(mid, mid, z)[1]);
  const pick = (y) => bands.reduce((b, v, i) => (Math.abs(v - y) < Math.abs(bands[b] - y) ? i : b), 0);

  const groups = [[glass.sil], pads.map((p) => p.el), [slab.sil], legs.flatMap((L) => [L.el.sil, L.ins.sil]), tubes.map((t) => t.el.sil)];
  let act = -2;
  function light(a) {
    if (a === act) return;
    act = a;
    const on = a < 0 ? 2 : a;
    groups.forEach((els, i) => els.forEach((el) => {
      if (i === 1) el.setAttribute("class", "dot " + (i === on ? "" : "m"));
      else el.classList.toggle("hi", i === on);
    }));
  }

  const E = spring(REST, { eps: 0.002 });
  const B = register(stage, (dt) => { const m = stepS(E, dt); draw(clamp(E.x, 0, 1)); return m; });
  bag.add(B.unregister);
  light(-1);

  bag.add(pointer(stage, {
    move: ([x, y]) => {
      E.t = clamp(1 - (x - 90) / 200, 0, 1);
      const a = pick(y);
      light(a);
      read.textContent = `${PARTS[a]} ${Math.round((1 - E.t) * 100)}%`;
      B.wake();
    },
    leave: () => { E.t = REST; light(-1); read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gap = v; drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "cobogo",
  means: "A side table in exploded view: move right and its glass, top, legs and frame close up into one piece.",
  rules: [1, 3, 5, 6],
  range: [16, 26, 36],
  tour: [[120, 110], [200, 150], [300, 200], null],
  mount,
});
