import { createAtom, charge, shells } from './chemistry.js';

// Guided models. The original free-form particle editor and ionic-force
// simulation are deliberately unchanged.
export const ionicPresets = [
  { id: 'nacl', name: 'Table salt · NaCl', donor: 11, acceptor: 17, electrons: 1,
    explanation: 'Sodium transfers one electron to chlorine. Na⁺ and Cl⁻ attract. A real salt crystal contains many ions, not one molecule.' },
  { id: 'lif', name: 'Lithium fluoride · LiF', donor: 3, acceptor: 9, electrons: 1,
    explanation: 'Lithium loses one electron; fluorine gains one. Li⁺ and F⁻ attract.' },
  { id: 'mgo', name: 'Magnesium oxide · MgO', donor: 12, acceptor: 8, electrons: 2,
    explanation: 'Magnesium transfers two electrons to oxygen. Mg²⁺ and O²⁻ attract.' },
  { id: 'cao', name: 'Calcium oxide · CaO', donor: 20, acceptor: 8, electrons: 2,
    explanation: 'Calcium transfers two electrons to oxygen. Ca²⁺ and O²⁻ attract.' }
];

export const covalentPresets = [
  { id: 'h2', name: 'Hydrogen · H₂', atoms: [
    { z: 1, x: -1.35, y: 0 }, { z: 1, x: 1.35, y: 0 }
  ], bonds: [[0, 1, 1]],
    explanation: 'Two hydrogen atoms share one electron pair. Each counts the shared pair toward its first shell.' },
  { id: 'h2o', name: 'Water · H₂O', atoms: [
    { z: 8, x: 0, y: 0.2 }, { z: 1, x: -2.2, y: -1.2 }, { z: 1, x: 2.2, y: -1.2 }
  ], bonds: [[0, 1, 1], [0, 2, 1]],
    explanation: 'Oxygen shares one pair with each hydrogen. Oxygen also has two lone pairs, not shown in this bond view.' },
  { id: 'ch4', name: 'Methane · CH₄', atoms: [
    { z: 6, x: 0, y: 0 }, { z: 1, x: 0, y: 2.65 }, { z: 1, x: 2.65, y: 0 },
    { z: 1, x: 0, y: -2.65 }, { z: 1, x: -2.65, y: 0 }
  ], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    explanation: 'Carbon shares four electron pairs with four hydrogens. The flat layout is a schematic; methane is tetrahedral in 3D.' },
  { id: 'co2', name: 'Carbon dioxide · CO₂', atoms: [
    { z: 6, x: 0, y: 0 }, { z: 8, x: -2.7, y: 0 }, { z: 8, x: 2.7, y: 0 }
  ], bonds: [[0, 1, 2], [0, 2, 2]],
    explanation: 'Carbon shares two pairs with each oxygen: two double bonds. CO₂ is linear; oxygen lone pairs are omitted.' }
];

export function transferAllowed(donor, acceptor, preset) {
  if (!donor || !acceptor || !preset) return false;
  if (donor.p !== preset.donor || acceptor.p !== preset.acceptor) return false;
  if (charge(donor) !== 0 || charge(acceptor) !== 0) return false;
  if (donor.e < preset.electrons || acceptor.e + preset.electrons > 20) return false;
  const before = shells(donor.e);
  const after = shells(donor.e - preset.electrons);
  const gained = shells(acceptor.e + preset.electrons);
  // Restrict guided transfer to the configured neutral pair with a
  // smaller donor outer shell and a filled recipient outer shell.
  return before.length > after.length &&
    gained[gained.length - 1] === (gained.length === 1 ? 2 : 8);
}

export function sharingAllowed(atoms, preset) {
  return !!preset && atoms.length === preset.atoms.length &&
    atoms.every((atom, i) => atom.p === preset.atoms[i].z && charge(atom) === 0);
}

function point(lab, atom) {
  return lab.projectPoint(atom.x, atom.y);
}

function glowDot(x, y, radius, color, opacity = 1) {
  return '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) +
    '" r="' + radius + '" fill="' + color + '" opacity="' + opacity +
    '" filter="url(#electron-glow)"/>' +
    '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) +
    '" r="' + Math.max(2, radius * .4) + '" fill="#ffffff" opacity="' + opacity + '"/>';
}

export class BondLab {
  constructor(lab, overlay, status, actions) {
    this.lab = lab;
    this.overlay = overlay;
    this.status = status;
    this.actions = actions;
    this.mode = null;
    this.transfer = null;
    this.completed = false;
  }

  reset() {
    this.mode = null;
    this.transfer = null;
    this.completed = false;
    this.overlay.replaceChildren();
    this.status.textContent = 'Free exploration: manual electron edits and ion attraction still work as before.';
  }

  load(kind, id) {
    const preset = (kind === 'ionic' ? ionicPresets : covalentPresets)
      .find(item => item.id === id);
    if (!preset) return;
    this.actions.snapshot();
    this.transfer = null;
    this.completed = false;
    let atoms;
    if (kind === 'ionic') {
      atoms = [createAtom(preset.donor, -3.5, 0), createAtom(preset.acceptor, 3.5, 0)];
    } else {
      atoms = preset.atoms.map(item => createAtom(item.z, item.x, item.y));
    }
    this.mode = { kind, preset, ids: atoms.map(atom => atom.id) };
    this.actions.replace(atoms);
    this.status.textContent = kind === 'ionic'
      ? 'GUIDED TRANSFER · Drag the two neutral atoms close together. Watch ' +
        preset.electrons + (preset.electrons === 1 ? ' electron move.' : ' electrons move.')
      : 'SHARED ELECTRONS · Glowing pairs mark shared electron density, not literal electron orbits. ' +
        preset.explanation;
  }

  update(now) {
    if (!this.mode || this.lab.focusId) {
      this.overlay.replaceChildren();
      return;
    }
    const atoms = this.actions.getAtoms();
    const mapped = this.mode.ids.map(id => atoms.find(a => a.id === id));
    if (mapped.some(a => !a)) {
      this.reset();
      return;
    }
    const { kind, preset } = this.mode;
    const rect = this.overlay.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.overlay.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
    let svg = '<defs><filter id="electron-glow" x="-200%" y="-200%" width="500%" height="500%">' +
      '<feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/>' +
      '<feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

    if (kind === 'ionic') {
      const donor = mapped[0], acceptor = mapped[1];
      const distance = Math.hypot(donor.x - acceptor.x, donor.y - acceptor.y);
      if (!this.completed && !this.transfer && distance < 3.6 &&
          transferAllowed(donor, acceptor, preset)) {
        this.actions.snapshot();
        this.transfer = { started: now, duration: 1850 };
        this.status.textContent = 'ELECTRON TRANSFER IN PROGRESS · Watch the glowing electron ' +
          (preset.electrons === 1 ? 'move' : 'pairs move') + ' from donor to acceptor.';
      }
      if (this.transfer) {
        const t = Math.min(1, (now - this.transfer.started) / this.transfer.duration);
        const eased = t * t * (3 - 2 * t);
        const a = point(this.lab, donor), b = point(this.lab, acceptor);
        const dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / length, ny = dx / length;
        svg += '<path d="M ' + a.x + ' ' + a.y + ' L ' + b.x + ' ' + b.y +
          '" stroke="#6ee7da" stroke-width="2" stroke-dasharray="6 8" opacity=".7"/>';
        for (let i = 0; i < preset.electrons; i++) {
          const offset = (i - (preset.electrons - 1) / 2) * 32;
          const arc = Math.sin(Math.PI * eased) * (40 + offset);
          const x = a.x + dx * eased + nx * arc;
          const y = a.y + dy * eased + ny * arc;
          svg += glowDot(x, y, 10, '#7dffe1');
        }
        if (t >= 1) {
          // The original free-form particle editing remains untouched.
          if (transferAllowed(donor, acceptor, preset)) {
            donor.e -= preset.electrons;
            acceptor.e += preset.electrons;
            this.actions.refresh();
            this.actions.save();
          }
          this.completed = true;
          this.transfer = null;
          this.status.textContent = 'TRANSFER COMPLETE · ' + preset.explanation +
            ' Use Zoom into atom to inspect the new shell counts.';
        }
      }
    } else if (sharingAllowed(mapped, preset)) {
      for (const [ia, ib, pairs] of preset.bonds) {
        const aAtom = mapped[ia], bAtom = mapped[ib];
        if (Math.hypot(aAtom.x - bAtom.x, aAtom.y - bAtom.y) > 3.5) continue;
        const a = point(this.lab, aAtom), b = point(this.lab, bAtom);
        const dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / length, ny = dx / length;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        svg += '<ellipse cx="' + midX + '" cy="' + midY + '" rx="' +
          Math.min(65, length * .29) + '" ry="16" transform="rotate(' + angle + ' ' +
          midX + ' ' + midY + ')" fill="#73f8d9" opacity=".13"/>';
        for (let i = 0; i < pairs; i++) {
          const off = (i - (pairs - 1) / 2) * 15;
          svg += '<line x1="' + (a.x + nx * off) + '" y1="' + (a.y + ny * off) +
            '" x2="' + (b.x + nx * off) + '" y2="' + (b.y + ny * off) +
            '" stroke="#85e7db" stroke-width="2.5" opacity=".6"/>';
          const phase = now * .002 + i * 1.8;
          const drift = Math.sin(phase) * Math.min(23, length * .14);
          const cx = midX + nx * off, cy = midY + ny * off;
          const ux = dx / length, uy = dy / length;
          svg += glowDot(cx + ux * drift + nx * 9, cy + uy * drift + ny * 9, 6, '#82ffe4');
          svg += glowDot(cx - ux * drift - nx * 9, cy - uy * drift - ny * 9, 6, '#82ffe4');
        }
      }
    }
    this.overlay.innerHTML = svg;
  }
}
