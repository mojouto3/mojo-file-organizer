import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { FIELD_OPTIONS, OPS_BY_FIELD, defaultCondition } from '../lib/ruleFields.js';
import { showToast } from '../lib/toast.js';

const inputClass = 'rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none';
// Selects need an opaque background, not bg-transparent: Chromium's native
// <select> popup on Windows renders with a white background regardless of
// the closed box's background, so pairing bg-transparent with this app's
// light text color made the open dropdown's text invisible (white-on-white).
const selectClass = 'rounded-md border border-mfo-border bg-mfo-surface2 px-2 py-1 text-[12px] text-mfo-text outline-none';

function ConditionRow({ condition, onChange, onRemove }) {
  const { t } = useTranslation();
  const setField = (field) => onChange({ ...defaultCondition(field) });
  const set = (patch) => onChange({ ...condition, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-mfo-border p-2">
      <select value={condition.field} onChange={(e) => setField(e.target.value)} className={selectClass}>
        {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{t(f.labelKey)}</option>)}
      </select>

      {condition.field === 'name' && (
        <>
          <select value={condition.op} onChange={(e) => set({ op: e.target.value })} className={selectClass}>
            {OPS_BY_FIELD.name.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
          <input value={condition.value} onChange={(e) => set({ value: e.target.value })} placeholder={t('rules.placeholderText')} className={`${inputClass} min-w-0 flex-1`} />
        </>
      )}

      {condition.field === 'extension' && (
        <input value={condition.value} onChange={(e) => set({ value: e.target.value })} placeholder=".exe" className={`${inputClass} min-w-0 flex-1`} />
      )}

      {condition.field === 'age' && (
        <>
          <select value={condition.op} onChange={(e) => set({ op: e.target.value })} className={selectClass}>
            {OPS_BY_FIELD.age.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
          <input type="number" min={0} value={condition.value} onChange={(e) => set({ value: e.target.value })} className={`${inputClass} w-20`} />
          <select value={condition.unit} onChange={(e) => set({ unit: e.target.value })} className={selectClass}>
            <option value="days">{t('rules.days')}</option>
            <option value="months">{t('rules.months')}</option>
          </select>
        </>
      )}

      {condition.field === 'date_range' && (
        <>
          <span className="text-[11px] text-mfo-text-dim">{t('rules.from')}</span>
          <input type="date" value={condition.valueFrom} onChange={(e) => set({ valueFrom: e.target.value })} className={inputClass} />
          <span className="text-[11px] text-mfo-text-dim">{t('rules.to')}</span>
          <input type="date" value={condition.valueTo} onChange={(e) => set({ valueTo: e.target.value })} className={inputClass} />
        </>
      )}

      {condition.field === 'size' && (
        <>
          <select value={condition.op} onChange={(e) => set({ op: e.target.value })} className={selectClass}>
            {OPS_BY_FIELD.size.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
          <input type="number" min={0} value={condition.value} onChange={(e) => set({ value: e.target.value })} className={`${inputClass} w-20`} />
          <select value={condition.unit} onChange={(e) => set({ unit: e.target.value })} className={selectClass}>
            <option value="KB">KB</option>
            <option value="MB">MB</option>
            <option value="GB">GB</option>
          </select>
        </>
      )}

      {condition.field === 'content' && (
        <>
          <select value={condition.op} onChange={(e) => set({ op: e.target.value })} className={selectClass}>
            {OPS_BY_FIELD.content.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
          <input value={condition.value} onChange={(e) => set({ value: e.target.value })} placeholder={t('rules.placeholderKeyword')} className={`${inputClass} min-w-0 flex-1`} />
        </>
      )}

      <button onClick={onRemove} className="ml-auto text-mfo-text-dim hover:text-mfo-danger" aria-label={t('rules.removeCondition')}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function RuleEditorModal({ open, rule, onSave, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [logic, setLogic] = useState('AND');
  const [conditions, setConditions] = useState([defaultCondition()]);
  const [actionType, setActionType] = useState('move');
  const [dest, setDest] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(rule?.name || '');
    setLogic(rule?.logic || 'AND');
    setConditions(rule?.conditions?.length ? rule.conditions.map((c) => ({ ...c })) : [defaultCondition()]);
    setActionType(rule?.action?.type || 'move');
    setDest(rule?.action?.dest || '');
  }, [open, rule]);

  const updateCondition = (i, next) => setConditions((c) => c.map((x, idx) => (idx === i ? next : x)));
  const removeCondition = (i) => setConditions((c) => c.filter((_, idx) => idx !== i));
  const addCondition = () => setConditions((c) => [...c, defaultCondition()]);

  const pickDest = () => window.api.pickFolder().then((f) => f && setDest(f));

  const handleSave = () => {
    if (!name.trim()) { showToast(t('rules.enterRuleName')); return; }
    if (!conditions.length) { showToast(t('rules.addConditionFirst')); return; }
    onSave({
      id: rule?.id || Date.now(),
      name: name.trim(),
      conditions,
      logic,
      action: (actionType === 'move' || actionType === 'dateTaken') ? { type: actionType, dest } : { type: actionType },
      enabled: rule?.enabled ?? true
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={rule ? t('rules.editRule') : t('rules.addRule')}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[11.5px] text-mfo-text-dim">{t('rules.ruleNameLabel')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('rules.ruleNamePlaceholder')}
            className={`${inputClass} w-full`}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11.5px] text-mfo-text-dim">{t('rules.conditionsLabel')}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-mfo-text-dim">{t('rules.match')}</span>
              <select value={logic} onChange={(e) => setLogic(e.target.value)} className={selectClass}>
                <option value="AND">{t('rules.matchAll')}</option>
                <option value="OR">{t('rules.matchAny')}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {conditions.map((c, i) => (
              <ConditionRow key={i} condition={c} onChange={(next) => updateCondition(i, next)} onRemove={() => removeCondition(i)} />
            ))}
          </div>
          <Button variant="outline" onClick={addCondition} className="mt-1.5 px-2.5 py-1 text-[11px]"><Plus size={12} />{t('rules.addCondition')}</Button>
        </div>

        <div>
          <label className="mb-1 block text-[11.5px] text-mfo-text-dim">{t('rules.actionLabel')}</label>
          <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={`${selectClass} w-full`}>
            <option value="move">{t('rules.actionMoveOption')}</option>
            <option value="dateTaken">{t('rules.actionDateTakenOption')}</option>
            <option value="delete">{t('common.delete')}</option>
            <option value="rename">{t('rules.rename')}</option>
          </select>
          {(actionType === 'move' || actionType === 'dateTaken') && (
            <div className="mt-1.5 flex gap-1.5">
              <input readOnly value={dest} placeholder={t('rules.destinationPlaceholder')} className={`${inputClass} flex-1`} />
              <button onClick={pickDest} className="rounded-md border border-mfo-border px-2.5 py-1 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text">{t('common.browse')}</button>
            </div>
          )}
          {actionType === 'dateTaken' && (
            <p className="mt-1.5 text-[11px] text-mfo-text-dim">{t('rules.dateTakenHint')}</p>
          )}
          {actionType === 'rename' && (
            <p className="mt-1.5 text-[11px] text-mfo-text-dim">{t('rules.renameHint')}</p>
          )}
          {actionType === 'delete' && (
            <p className="mt-1.5 text-[11px] text-mfo-danger">{t('rules.deleteHint')}</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-mfo-border pt-3">
          <Button onClick={handleSave}>{t('rules.saveRule')}</Button>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}
