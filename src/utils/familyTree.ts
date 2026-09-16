/**
 * Family tree layout engine — mirror of
 * fe/src/components/content-builder/widgets/familyTreeShared.js (keep in sync).
 */

export interface FtPerson {
  id: string
  first_name?: string
  last_name?: string
  maiden_name?: string
  gender?: string
  birth?: string
  death?: string
  deceased?: boolean
  photo?: string
  note?: string
  father_id?: string | null
  mother_id?: string | null
  partner_ids?: string[]
}

export interface FtMetrics {
  cardW: number
  cardH: number
  coupleGap: number
  siblingGap: number
  familyGap: number
  rowGap: number
}

export interface FtNode { id: string; person: FtPerson; x: number; y: number; gen: number; isRoot: boolean }
export interface FtLink { kind: 'couple' | 'child'; d: string }
export interface FtLayout { nodes: FtNode[]; links: FtLink[]; width: number; height: number; rootId: string | null }

type Pt = { x: number; y: number }
type RawLink = { kind: 'couple' | 'child'; pts: Pt[] }
type Family = { partnerIdx: number; solo: string | null; kids: string[]; groups: Group[]; width: number; anchorX: number; start: number }
type Group = { id: string; row: string[]; rowX: number[]; rowOffset: number; width: number; families: Family[] }

export const DEFAULT_METRICS: FtMetrics = {
  cardW: 200,
  cardH: 72,
  coupleGap: 28,
  siblingGap: 24,
  familyGap: 40,
  rowGap: 64
}

export function fullName (p: FtPerson | null | undefined): string {
  if (!p) return ''
  const base = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  return p.maiden_name ? (base ? `${base}, ${p.maiden_name}` : p.maiden_name) : base
}

// "1942-03-01" → "1942"; anything else is shown as typed.
export function yearOf (v: string | null | undefined): string {
  if (!v) return ''
  const m = /^(\d{4})(-\d{2})?(-\d{2})?$/.exec(String(v).trim())
  return m ? m[1] : String(v).trim()
}

export function lifeSpan (p: FtPerson | null | undefined, deceasedLabel = ''): string {
  if (!p) return ''
  const b = yearOf(p.birth)
  const d = yearOf(p.death)
  if (b && d) return `${b} – ${d}`
  if (b) return p.deceased ? `${b} – †` : b
  if (d) return `† ${d}`
  return p.deceased ? deceasedLabel : ''
}

function roundedPath (pts: Pt[], r: number): string {
  const clean = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y)
  if (clean.length < 2) return ''
  let d = `M${clean[0].x},${clean[0].y}`
  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1]; const cur = clean[i]; const next = clean[i + 1]
    const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    const d2 = Math.hypot(next.x - cur.x, next.y - cur.y)
    const rr = Math.min(r, d1 / 2, d2 / 2)
    if (rr < 0.5) { d += ` L${cur.x},${cur.y}`; continue }
    const p1 = { x: cur.x + (prev.x - cur.x) / d1 * rr, y: cur.y + (prev.y - cur.y) / d1 * rr }
    const p2 = { x: cur.x + (next.x - cur.x) / d2 * rr, y: cur.y + (next.y - cur.y) / d2 * rr }
    d += ` L${p1.x},${p1.y} Q${cur.x},${cur.y} ${p2.x},${p2.y}`
  }
  const last = clean[clean.length - 1]
  d += ` L${last.x},${last.y}`
  return d
}

/**
 * MyHeritage-style layout: the home person's parents' family is laid out as a
 * descendant tree (siblings, partners, children…) and a pedigree of direct
 * ancestors grows upwards from each parent. Unconnected people are appended
 * to the right so nothing silently disappears.
 *
 * Returns { nodes: [{ id, person, x, y, gen, isRoot }], links: [{ kind, d }],
 *           width, height, rootId }
 */
export function buildTreeLayout (personsIn: FtPerson[] | null | undefined, rootId: string | null | undefined, metricsIn: Partial<FtMetrics> = {}): FtLayout {
  const m: FtMetrics = { ...DEFAULT_METRICS, ...metricsIn }
  const persons = (Array.isArray(personsIn) ? personsIn : []).filter(p => p && p.id)
  const byId = new Map<string, FtPerson>(persons.map(p => [p.id, p]))
  if (!persons.length) return { nodes: [], links: [], width: 0, height: 0, rootId: null }

  const root = (rootId && byId.get(rootId)) || persons[0]
  const has = (id: string | null | undefined): id is string => !!id && byId.has(id)
  const rowStep = m.cardH + m.rowGap
  const midY = m.cardH / 2

  const partnersOf = (id: string): string[] => {
    const out: string[] = []
    const push = (x: string | null | undefined) => { if (has(x) && x !== id && !out.includes(x)) out.push(x) }
    const p = byId.get(id)!
    ;(p.partner_ids || []).forEach(push)
    persons.forEach(o => { if ((o.partner_ids || []).includes(id)) push(o.id) })
    persons.forEach(c => {
      if (c.father_id === id && has(c.mother_id)) push(c.mother_id)
      if (c.mother_id === id && has(c.father_id)) push(c.father_id)
    })
    return out
  }

  // Children of the (a, b) couple; b === null → children of a whose other
  // parent is unknown / not in the tree.
  const childrenOf = (a: string, b: string | null): string[] => persons.filter(c => {
    const known = [c.father_id, c.mother_id].filter(has)
    if (b) return known.length === 2 && known.includes(a) && known.includes(b)
    return known.length === 1 && known[0] === a
  }).map(c => c.id)

  const visited = new Set<string>()
  const nodes: FtNode[] = []
  const rawLinks: RawLink[] = []

  // ---- descendant groups -------------------------------------------------
  function buildGroup (id: string): Group {
    visited.add(id)
    const partners = partnersOf(id).filter(p => !visited.has(p))
    partners.forEach(p => visited.add(p))
    const row = [id, ...partners]
    const rowX: number[] = [0]
    for (let j = 1; j < row.length; j++) rowX[j] = rowX[j - 1] + m.cardW + m.coupleGap
    const rowWidth = rowX[row.length - 1] + m.cardW

    const families: Family[] = []
    const fam = (partnerIdx: number, solo: string | null, kids: string[]): Family => ({ partnerIdx, solo, kids, groups: [], width: 0, anchorX: 0, start: 0 })
    partners.forEach((p, i) => {
      families.push(fam(i + 1, null, childrenOf(id, p)))
      families.push(fam(i + 1, p, childrenOf(p, null)))
    })
    families.push(fam(0, id, childrenOf(id, null)))

    families.forEach(f => {
      f.groups = []
      f.kids.forEach(k => { if (!visited.has(k)) f.groups.push(buildGroup(k)) })
      f.width = f.groups.reduce((s, g) => s + g.width, 0) + Math.max(0, f.groups.length - 1) * m.siblingGap
      if (f.solo) {
        f.anchorX = rowX[row.indexOf(f.solo)] + m.cardW / 2
      } else {
        f.anchorX = (rowX[f.partnerIdx - 1] + m.cardW + rowX[f.partnerIdx]) / 2
      }
    })
    const live = families.filter(f => f.groups.length).sort((a, b) => a.anchorX - b.anchorX)
    let prevEnd = -Infinity
    live.forEach(f => {
      f.start = Math.max(f.anchorX - f.width / 2, prevEnd + m.familyGap)
      prevEnd = f.start + f.width
    })
    const minX = Math.min(0, ...live.map(f => f.start))
    const maxX = Math.max(rowWidth, ...live.map(f => f.start + f.width))
    return { id, row, rowX, rowOffset: -minX, width: maxX - minX, families: live }
  }

  function place (g: Group, absX: number, gen: number): void {
    const rowAbs = absX + g.rowOffset
    const y = gen * rowStep
    g.row.forEach((pid, j) => nodes.push({ id: pid, person: byId.get(pid)!, x: rowAbs + g.rowX[j], y, gen, isRoot: pid === root.id }))
    for (let j = 1; j < g.row.length; j++) {
      rawLinks.push({ kind: 'couple', pts: [{ x: rowAbs + g.rowX[j - 1] + m.cardW, y: y + midY }, { x: rowAbs + g.rowX[j], y: y + midY }] })
    }
    g.families.forEach(f => {
      const sx = rowAbs + f.anchorX
      const sy = f.solo ? y + m.cardH : y + midY
      const busY = y + m.cardH + m.rowGap / 2
      let cursor = rowAbs + f.start
      f.groups.forEach(cg => {
        const cx = cursor + cg.rowOffset + m.cardW / 2
        const ty = (gen + 1) * rowStep
        rawLinks.push({ kind: 'child', pts: [{ x: sx, y: sy }, { x: sx, y: busY }, { x: cx, y: busY }, { x: cx, y: ty }] })
        place(cg, cursor, gen + 1)
        cursor += cg.width + m.siblingGap
      })
    })
  }

  // ---- pedigree (direct ancestors) --------------------------------------
  const awMemo = new Map<string, number>()
  function ancestorsWidth (id: string, depth = 0): number {
    if (awMemo.has(id)) return awMemo.get(id)!
    const p = byId.get(id)!
    const fa = has(p.father_id) && depth < 40 ? p.father_id : null
    const mo = has(p.mother_id) && depth < 40 ? p.mother_id : null
    let width = 0
    if (fa) width += Math.max(m.cardW, ancestorsWidth(fa, depth + 1))
    if (mo) width += Math.max(m.cardW, ancestorsWidth(mo, depth + 1))
    if (fa && mo) width += m.coupleGap
    awMemo.set(id, width)
    return width
  }

  // `limit` keeps the two pedigree blocks of the home person's parents apart
  // (father's block stays left of the couple centre, mother's right of it)
  // while the couple itself stays adjacent — the link just bends.
  function placeAncestors (id: string, cx: number, gen: number, limit: { maxRight?: number; minLeft?: number } | null = null): void {
    const p = byId.get(id)!
    const fa = has(p.father_id) && !visited.has(p.father_id) ? p.father_id : null
    const mo = has(p.mother_id) && !visited.has(p.mother_id) ? p.mother_id : null
    if (!fa && !mo) return
    const y = (gen - 1) * rowStep
    const leftW = fa ? Math.max(m.cardW, ancestorsWidth(fa)) : 0
    const rightW = mo ? Math.max(m.cardW, ancestorsWidth(mo)) : 0
    const total = leftW + rightW + (fa && mo ? m.coupleGap : 0)
    let bcx = cx
    if (limit && limit.maxRight != null) bcx = Math.min(bcx, limit.maxRight - total / 2)
    if (limit && limit.minLeft != null) bcx = Math.max(bcx, limit.minLeft + total / 2)
    const startX = bcx - total / 2
    const faCx = startX + leftW / 2
    const moCx = fa ? startX + leftW + m.coupleGap + rightW / 2 : bcx
    if (fa) { visited.add(fa); nodes.push({ id: fa, person: byId.get(fa)!, x: faCx - m.cardW / 2, y, gen: gen - 1, isRoot: false }) }
    if (mo) { visited.add(mo); nodes.push({ id: mo, person: byId.get(mo)!, x: moCx - m.cardW / 2, y, gen: gen - 1, isRoot: false }) }
    let sx: number
    if (fa && mo) {
      rawLinks.push({ kind: 'couple', pts: [{ x: faCx + m.cardW / 2, y: y + midY }, { x: moCx - m.cardW / 2, y: y + midY }] })
      sx = (faCx + moCx) / 2
      rawLinks.push({ kind: 'child', pts: [{ x: sx, y: y + midY }, { x: sx, y: y + m.cardH + m.rowGap / 2 }, { x: cx, y: y + m.cardH + m.rowGap / 2 }, { x: cx, y: gen * rowStep }] })
    } else {
      sx = fa ? faCx : moCx
      rawLinks.push({ kind: 'child', pts: [{ x: sx, y: y + m.cardH }, { x: sx, y: y + m.cardH + m.rowGap / 2 }, { x: cx, y: y + m.cardH + m.rowGap / 2 }, { x: cx, y: gen * rowStep }] })
    }
    if (fa) placeAncestors(fa, faCx, gen - 1)
    if (mo) placeAncestors(mo, moCx, gen - 1)
  }

  // ---- assemble ----------------------------------------------------------
  const rootFa = has(root.father_id) ? root.father_id : null
  const rootMo = has(root.mother_id) ? root.mother_id : null
  const anchorId = rootFa || rootMo || root.id
  const main = buildGroup(anchorId)
  place(main, 0, 0)
  const centerOf = (id: string): number => { const n = nodes.find(x => x.id === id); return n ? n.x + m.cardW / 2 : 0 }
  if (rootFa && rootMo) {
    const mid = (centerOf(rootFa) + centerOf(rootMo)) / 2
    placeAncestors(rootFa, centerOf(rootFa), 0, { maxRight: mid - m.familyGap / 2 })
    placeAncestors(rootMo, centerOf(rootMo), 0, { minLeft: mid + m.familyGap / 2 })
  } else if (rootFa || rootMo) {
    const only = (rootFa || rootMo) as string
    placeAncestors(only, centerOf(only), 0)
  }
  // In-law parents are not part of the pedigree; only the home person's line.

  // Unconnected people → extra groups to the right, same baseline.
  let cursor = Math.max(...nodes.map(n => n.x + m.cardW)) + m.familyGap * 2
  persons.forEach(p => {
    if (visited.has(p.id)) return
    const g = buildGroup(p.id)
    place(g, cursor, 0)
    cursor += g.width + m.familyGap * 2
  })

  // Normalise to a 0-based box.
  const minX = Math.min(...nodes.map(n => n.x))
  const minY = Math.min(...nodes.map(n => n.y))
  const maxX = Math.max(...nodes.map(n => n.x + m.cardW))
  const maxY = Math.max(...nodes.map(n => n.y + m.cardH))
  nodes.forEach(n => { n.x -= minX; n.y -= minY })
  const links = rawLinks.map(l => ({ kind: l.kind, d: roundedPath(l.pts.map(p => ({ x: p.x - minX, y: p.y - minY })), 14) }))

  return { nodes, links, width: maxX - minX, height: maxY - minY, rootId: root.id }
}
