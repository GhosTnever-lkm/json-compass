export function jsonPath(path) {
  return '$' + path.map(part => typeof part === 'number'
    ? `[${part}]`
    : /^[A-Za-z_$][\w$]*$/.test(part) ? `.${part}` : `[${JSON.stringify(part)}]`).join('');
}

export function compareJson(before, after) {
  const changes = [];
  function compareValues(left, right, path) {
    if (Object.is(left, right)) return;
    const bothObjects = left !== null && right !== null
      && typeof left === 'object' && typeof right === 'object'
      && Array.isArray(left) === Array.isArray(right);
    if (bothObjects) {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of keys) {
        const hasLeft = Object.prototype.hasOwnProperty.call(left, key);
        const hasRight = Object.prototype.hasOwnProperty.call(right, key);
        const part = Array.isArray(right) || Array.isArray(left) ? Number(key) : key;
        const next = [...path, part];
        if (!hasLeft) changes.push({ kind: 'added', path: next, after: right[key] });
        else if (!hasRight) changes.push({ kind: 'removed', path: next, before: left[key] });
        else compareValues(left[key], right[key], next);
      }
      return;
    }
    changes.push({ kind: 'changed', path, before: left, after: right });
  }
  compareValues(before, after, []);
  return changes;
}