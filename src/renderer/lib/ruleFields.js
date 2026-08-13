export const FIELD_OPTIONS = [
  { value: 'name', labelKey: 'rules.fieldName' },
  { value: 'extension', labelKey: 'rules.fieldExtension' },
  { value: 'age', labelKey: 'rules.fieldAge' },
  { value: 'date_range', labelKey: 'rules.fieldDateRange' },
  { value: 'size', labelKey: 'rules.fieldSize' },
  { value: 'content', labelKey: 'rules.fieldContent' }
];

export const OPS_BY_FIELD = {
  name: [
    { value: 'contains', labelKey: 'rules.opContains' },
    { value: 'not_contains', labelKey: 'rules.opNotContains' },
    { value: 'starts', labelKey: 'rules.opStarts' },
    { value: 'ends', labelKey: 'rules.opEnds' }
  ],
  age: [
    { value: 'gt', labelKey: 'rules.opOlderThan' },
    { value: 'lt', labelKey: 'rules.opNewerThan' }
  ],
  size: [
    { value: 'gt', labelKey: 'rules.opLargerThan' },
    { value: 'lt', labelKey: 'rules.opSmallerThan' }
  ],
  content: [
    { value: 'contains', labelKey: 'rules.opContains' },
    { value: 'not_contains', labelKey: 'rules.opNotContains' }
  ]
};

export function defaultCondition(field = 'name') {
  if (field === 'age') return { field, op: 'gt', value: '', unit: 'days' };
  if (field === 'size') return { field, op: 'gt', value: '', unit: 'MB' };
  if (field === 'date_range') return { field, valueFrom: '', valueTo: '' };
  if (field === 'extension') return { field, value: '' };
  return { field, op: 'contains', value: '' };
}

export function summarizeCondition(t, c) {
  switch (c.field) {
    case 'name': {
      const op = OPS_BY_FIELD.name.find((o) => o.value === c.op);
      return t('rules.summaryName', { op: op ? t(op.labelKey) : c.op, value: c.value });
    }
    case 'extension':
      return t('rules.summaryExtension', { value: c.value });
    case 'age': {
      const op = t(c.op === 'lt' ? 'rules.opNewerThan' : 'rules.opOlderThan');
      return t('rules.summaryAge', { op, value: c.value, unit: c.unit });
    }
    case 'date_range':
      return t('rules.summaryDateRange', { from: c.valueFrom || '...', to: c.valueTo || '...' });
    case 'size': {
      const op = t(c.op === 'lt' ? 'rules.opSmallerThan' : 'rules.opLargerThan');
      return t('rules.summarySize', { op, value: c.value, unit: c.unit });
    }
    case 'content': {
      const op = t(c.op === 'not_contains' ? 'rules.opNotContains' : 'rules.opContains');
      return t('rules.summaryContent', { op, value: c.value });
    }
    default:
      return '';
  }
}

export function summarizeRule(t, rule) {
  const joiner = rule.logic === 'OR' ? ` ${t('rules.logicOr')} ` : ` ${t('rules.logicAnd')} `;
  const conditions = (rule.conditions || []).map((c) => summarizeCondition(t, c)).join(joiner);
  const action = rule.action?.type === 'move'
    ? t('rules.moveTo', { name: rule.action.dest || t('rules.noFolderSet') })
    : rule.action?.type === 'delete'
      ? t('common.delete')
      : t('rules.rename');
  return `${t('rules.summaryIf')} ${conditions} → ${action}`;
}
