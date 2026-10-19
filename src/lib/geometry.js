// Scene coordinates (same layout maths as the original canvas version)
export const W = 400, H = 520, GROUND = H - 16, BALL_R = 15
export const BOX = { x: 105, y: GROUND - 180, w: 190, h: 180 }
const TW = 52, TH = 290
export const TUBES = {
  R: { x: BOX.x - TW - 16, y: GROUND - TH, w: TW, h: TH },
  Y: { x: BOX.x + BOX.w + 16, y: GROUND - TH, w: TW, h: TH },
}
const ay = BOX.y - 110, rx = BOX.x + BOX.w * 0.18, yx = BOX.x + BOX.w * 0.82
export const AV = {
  R: { x: rx, y: ay, sh: { x: rx + 16, y: ay + 42 }, rest: { x: rx + 22, y: BOX.y - 12 } },
  Y: { x: yx, y: ay, sh: { x: yx - 16, y: ay + 42 }, rest: { x: yx - 22, y: BOX.y - 12 } },
}
// One cell of the 4x3 grid inside the box (slot 0 = top-left)
export function slotGeom(i) {
  const pad = 10, head = 22, cw = (BOX.w - pad * 2) / 4, ch = (BOX.h - pad * 2 - head) / 3
  const c = i % 4, r = Math.floor(i / 4)
  const x = BOX.x + pad + c * cw, y = BOX.y + pad + head + r * ch
  return { x, y, w: cw, h: ch, cx: x + cw / 2, cy: y + ch / 2, sx: x + cw * 0.08, sy: y + ch * 0.08, sw: cw * 0.84, sh: ch * 0.84 }
}
