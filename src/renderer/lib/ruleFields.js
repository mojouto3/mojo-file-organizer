export const FIELD_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'extension', label: 'Extension' },
  { value: 'age', label: 'Age' },
  { value: 'date_range', label: 'Date range' },
  { value: 'size', label: 'Size' },
  { value: 'content', label: 'Content' }
];

export const OPS_BY_FIELD = {
  name: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts', label: 'starts with' },
    { value: 'ends', label: 'ends with' }
  ],
  age: [
    { value: 'gt', label: 'older than' },
    { value: 'lt', label: 'newer than' }
  ],
  size: [
    { value: 'gt', label: 'larger than' },
    { value: 'lt', label: 'smaller than' }
  ],
  content: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' }
  ]
};

export function defaultCondition(field = 'name') {
  if (field === 'age') return { field, op: 'gt', value: '', unit: 'days' };
  if (field === 'size') return { field, op: 'gt', value: '', unit: 'MB' };
  if (field === 'date_range') return { field, valueFrom: '', valueTo: '' };
  if (field === 'extension') return { field, value: '' };
  return { field, op: 'contains', value: '' };
}

export function summarizeCondition(c) {
  switch (c.field) {
    case 'name': {
      const op = OPS_BY_FIELD.name.find((o) => o.value === c.op)?.label || c.op;
      return `name ${op} "${c.value}"`;
    }
    case 'extension':
      return `extension is ${c.value}`;
    case 'age': {
      const op = c.op === 'lt' ? 'newer than' : 'older than';
      return `${op} ${c.value} ${c.unit}`;
    }
    case 'date_range':
      return `dated ${c.valueFrom || '...'} to ${c.valueTo || '...'}`;
    case 'size': {
      const op = c.op === 'lt' ? 'smaller than' : 'larger than';
      return `${op} ${c.value} ${c.unit}`;
    }
    case 'content': {
      const op = c.op === 'not_contains' ? 'does not contain' : 'contains';
      return `content ${op} "${c.value}"`;
    }
    default:
      return '';
  }
}

export function summarizeRule(rule) {
  const joiner = rule.logic === 'OR' ? ' OR ' : ' AND ';
  const conditions = (rule.conditions || []).map(summarizeCondition).join(joiner);
  const action = rule.action?.type === 'move'
    ? `Move to ${rule.action.dest || '(no folder set)'}`
    : rule.action?.type === 'delete'
      ? 'Delete'
      : 'Rename';
  return `IF ${conditions} → ${action}`;
}
