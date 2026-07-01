// tree_guard.js - the hook, not the prompt. Validates eval/tree.json:
// R1 every node: path + status in {PASS,FIXED,PENDING,USER,BOUNCED}; evidence required unless PENDING
// R2 BRANCH xor UNIT; BRANCH has priors>=1; UNIT has an irreducible 'why'
// R3 every prior resolves to an existing node (no dangling children)
// R4 a BRANCH may be PASS/FIXED only if ALL children are PASS/FIXED;
//    ROOT may NEVER be PASS while any node is PENDING or USER-unconfirmed
// R5 USER nodes must carry a concrete checklist in 'evidence'
module.exports = function validate(tree) {
  const errs = [], nodes = tree.nodes || [], byPath = {};
  const ST = ['PASS', 'FIXED', 'PENDING', 'USER', 'BOUNCED'];
  for (const n of nodes) {
    if (!n.path || ST.indexOf(n.status) < 0) errs.push('R1 ' + (n.path || '?'));
    if (n.status !== 'PENDING' && !(n.evidence || n.status === 'USER' && n.evidence)) { if (!n.evidence) errs.push('R1-evidence ' + n.path); }
    const isB = n.type === 'BRANCH', isU = n.type === 'UNIT';
    if (isB === isU) errs.push('R2-xor ' + n.path);
    if (isB && !(n.priors && n.priors.length)) errs.push('R2-priors ' + n.path);
    if (isU && !n.why) errs.push('R2-why ' + n.path);
    byPath[n.path] = n;
  }
  for (const n of nodes) if (n.type === 'BRANCH') {
    for (const p of n.priors) if (!byPath[p]) errs.push('R3 ' + n.path + ' -> ' + p);
    if (n.status === 'PASS' || n.status === 'FIXED') {
      for (const p of n.priors) { const c = byPath[p]; if (!c || (c.status !== 'PASS' && c.status !== 'FIXED')) errs.push('R4 ' + n.path + ' closed over open child ' + p); }
    }
  }
  const root = byPath['ROOT'];
  if (root && (root.status === 'PASS' || root.status === 'FIXED')) {
    for (const n of nodes) if (n.status === 'PENDING' || n.status === 'USER') errs.push('R4-root closed while ' + n.path + ' is ' + n.status);
  }
  for (const n of nodes) if (n.status === 'USER' && !(n.evidence || '').length) errs.push('R5 ' + n.path);
  return errs;
};
