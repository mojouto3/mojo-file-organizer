import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { FIELD_OPTIONS, OPS_BY_FIELD, defaultCondition } from '../lib/ruleFields.js';
import { showToast } from '../lib/toast.js';

const inputClass = 'rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none';
const selectClass = `${inputClass}`;

function ConditionRow({ condition, onChange, onRemove }) {
  const setField = (field) => onChange({ ...defaultCondition(field) });
  const set = (patch) => onChange({ ...condition, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-mfo-border p-2">
      <select value={condition.field} onChange={(e) => setField(e.target.value)} className={selectClass}>
        {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {condition.field === 'name' && (
        <>
          <select value={condition.op} onChange={(e) => set({ op: e.target.value })} className={selectClass}>
            {OPS_BY_FIELD.name.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input value={condition.value} onChange={(e) => set({ value: e.target.value })} placeholder="text..." className={`${inputClass} min-w-0 flex-1`} />
        </>
      )}

      {condition.field === 'extension' && (
        <input value={condition.value} onChange={(e) => set({ value: e.target.value })} placeholder=".exe" className={`${inputClass} min-w-0 flex-1`} />
      )}

      {condition.field === 'age' && (
        <>
          <select value={condition.op} onChange={(e) => set({ op: e.target.value })} className={selectClass}>
            {OPS_BY_FIELD.age.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="number" min={0} value={condition.value} onChange={(e) => set({ value: e.target.value })} className={`${inputClass} w-20`} />
          <select value={condition.unit} onChange={(e) => set({ unit: e.target.value })} className={selectClass}>
            <option value="days">days</option>
            <option value="months">months</option>
          </select>
        </>
      )}

      {condition.field === 'date_range' && (
        <>
          <span className="text-[11px] text-mfo-text-dim">from</span>
          <input type="date" value={condition.valueFrom} onChange={(e) => set({ valueFrom: e.target.value })} className={inputClass} />
          <span className="text-[11px] text-mfo-text-dim">to</span>
          <input type="date" value={condition.valueTo} onChange={(e) => set({ valueTo: e.target.value })} className={inputClass} />
        </>
      )}

      {condition.field === 'size' && (
        <>
          <select value={condition.op} onChange={(e) => set({ op: e.target.value })} className={selectClass}>
            {OPS_BY_FIELD.size.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            {OPS_BY_FIELD.content.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input value={condition.value} onChange={(e) => set({ value: e.target.value })} placeholder="keyword..." className={`${inputClass} min-w-0 flex-1`} />
        </>
      )}

      <button onClick={onRemove} className="ml-auto text-mfo-text-dim hover:text-mfo-danger" aria-label="Remove condition">
        <X size={14} />
      </button>
    </div>
  );
}

export default function RuleEditorModal({ open, rule, onSave, onClose }) {
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
    if (!name.trim()) { showToast('Enter a rule name'); return; }
    if (!conditions.length) { showToast('Add at least one condition'); return; }
    onSave({
      id: rule?.id || Date.now(),
      name: name.trim(),
      conditions,
      logic,
      action: actionType === 'move' ? { type: 'move', dest } : { type: actionType },
      enabled: rule?.enabled ?? true
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit rule' : 'Add rule'}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[11.5px] text-mfo-text-dim">Rule name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Delete old installers"
            className={`${inputClass} w-full`}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11.5px] text-mfo-text-dim">Conditions</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-mfo-text-dim">Match</span>
              <select value={logic} onChange={(e) => setLogic(e.target.value)} className={selectClass}>
                <option value="AND">ALL</option>
                <option value="OR">ANY</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {conditions.map((c, i) => (
              <ConditionRow key={i} condition={c} onChange={(next) => updateCondition(i, next)} onRemove={() => removeCondition(i)} />
            ))}
          </div>
          <Button variant="outline" onClick={addCondition} className="mt-1.5 px-2.5 py-1 text-[11px]"><Plus size={12} />Add condition</Button>
        </div>

        <div>
          <label className="mb-1 block text-[11.5px] text-mfo-text-dim">Action</label>
          <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={`${selectClass} w-full`}>
            <option value="move">Move to folder</option>
            <option value="delete">Delete</option>
            <option value="rename">Rename</option>
          </select>
          {actionType === 'move' && (
            <div className="mt-1.5 flex gap-1.5">
              <input readOnly value={dest} placeholder="Destination folder..." className={`${inputClass} flex-1`} />
              <button onClick={pickDest} className="rounded-md border border-mfo-border px-2.5 py-1 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text">Browse</button>
            </div>
          )}
          {actionType === 'rename' && (
            <p className="mt-1.5 text-[11px] text-mfo-text-dim">Uses current Rename Rules from Settings.</p>
          )}
          {actionType === 'delete' && (
            <p className="mt-1.5 text-[11px] text-mfo-danger">Files will be moved to the Recycle Bin.</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-mfo-border pt-3">
          <Button onClick={handleSave}>Save rule</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
