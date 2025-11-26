let counter = 0;

export function v4() {
  return `00000000-0000-0000-0000-${String(counter++).padStart(12, '0')}`;
}
