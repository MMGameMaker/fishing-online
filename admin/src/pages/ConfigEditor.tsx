import type { JsonObject, JsonValue } from '../types';

type Change = (value: JsonValue) => void;

const isPrimitive = (value: JsonValue) => value === null || typeof value !== 'object';
const isObject = (value: JsonValue): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Ô nhập giữ đúng kiểu gốc: số vẫn là số, chuỗi (kể cả Gold dạng "120") vẫn là chuỗi. */
function PrimitiveInput({ value, onChange, label }: { value: JsonValue; onChange: Change; label: string }) {
  if (typeof value === 'boolean')
    return <input type="checkbox" aria-label={label} checked={value} onChange={(event) => onChange(event.target.checked)} />;
  if (typeof value === 'number')
    return (
      <input
        type="number"
        aria-label={label}
        value={value}
        step="any"
        onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
      />
    );
  if (value === null || typeof value === 'string')
    return <input aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
  return <JsonInput value={value} onChange={onChange} label={label} />;
}

/** Giá trị lồng sâu (ví dụ seatNumbers) sửa dạng JSON; JSON sai thì giữ nguyên giá trị cũ. */
function JsonInput({ value, onChange, label }: { value: JsonValue; onChange: Change; label: string }) {
  return (
    <input
      aria-label={label}
      defaultValue={JSON.stringify(value)}
      onBlur={(event) => {
        try {
          onChange(JSON.parse(event.target.value) as JsonValue);
        } catch {
          event.target.value = JSON.stringify(value);
        }
      }}
    />
  );
}

function ArrayTable({ rows, onChange, label }: { rows: JsonObject[]; onChange: Change; label: string }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td key={column}>
                <PrimitiveInput
                  label={`${label}[${index}].${column}`}
                  value={row[column] ?? null}
                  onChange={(value) => onChange(rows.map((item, at) => (at === index ? { ...item, [column]: value } : item)))}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ValueEditor({ value, onChange, path }: { value: JsonValue; onChange: Change; path: string }) {
  // Mảng object thành bảng; ô lồng sâu (ví dụ seatNumbers) sửa dạng JSON ngay trong ô.
  if (Array.isArray(value) && value.length > 0 && value.every(isObject))
    return <ArrayTable rows={value} onChange={onChange} label={path} />;
  if (isObject(value)) {
    const object = value;
    return (
      <div className="fields">
        {Object.entries(object).map(([key, child]) =>
          isPrimitive(child) ? (
            <label key={key}>
              <span>{key}</span>
              <PrimitiveInput label={`${path}.${key}`} value={child} onChange={(next) => onChange({ ...object, [key]: next })} />
            </label>
          ) : (
            <fieldset key={key}>
              <legend>{key}</legend>
              <ValueEditor path={`${path}.${key}`} value={child} onChange={(next) => onChange({ ...object, [key]: next })} />
            </fieldset>
          ),
        )}
      </div>
    );
  }
  return <PrimitiveInput label={path} value={value} onChange={onChange} />;
}
