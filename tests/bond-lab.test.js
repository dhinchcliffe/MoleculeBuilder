import test from 'node:test';
import assert from 'node:assert/strict';
import { createAtom, shells } from '../src/chemistry.js';
import { ionicPresets, covalentPresets, transferAllowed, sharingAllowed } from '../src/bond-lab.js';

test('all four ionic reactions transfer only from neutral matching atoms', () => {
  for (const p of ionicPresets) {
    const donor = createAtom(p.donor), acceptor = createAtom(p.acceptor);
    assert.equal(transferAllowed(donor, acceptor, p), true, p.id);
    donor.e -= p.electrons;
    acceptor.e += p.electrons;
    assert.equal(donor.p - donor.e, p.electrons);
    assert.equal(acceptor.p - acceptor.e, -p.electrons);
    assert.equal(transferAllowed(donor, acceptor, p), false, 'cannot transfer twice');
  }
});

test('guided ionic reaction never changes manually prepared charged atoms', () => {
  const preset = ionicPresets[0];
  const donor = createAtom(11), acceptor = createAtom(17);
  donor.e = 10;
  acceptor.e = 18;
  assert.equal(transferAllowed(donor, acceptor, preset), false);
});

test('guided covalent presets have valid atom indexes and neutral shell counts', () => {
  for (const p of covalentPresets) {
    const atoms = p.atoms.map(a => createAtom(a.z));
    assert.equal(sharingAllowed(atoms, p), true, p.id);
    for (const [a, b, pairs] of p.bonds) {
      assert.ok(a >= 0 && b >= 0 && a < atoms.length && b < atoms.length);
      assert.ok(pairs === 1 || pairs === 2);
    }
    atoms[0].e--;
    assert.equal(sharingAllowed(atoms, p), false);
  }
});

test('electron shell configurations for NaCl and MgO guided reactions', () => {
  const na = createAtom(11), cl = createAtom(17);
  na.e--; cl.e++;
  assert.deepEqual(shells(na.e), [2, 8]);
  assert.deepEqual(shells(cl.e), [2, 8, 8]);
  const mg = createAtom(12), o = createAtom(8);
  mg.e -= 2; o.e += 2;
  assert.deepEqual(shells(mg.e), [2, 8]);
  assert.deepEqual(shells(o.e), [2, 8]);
});
