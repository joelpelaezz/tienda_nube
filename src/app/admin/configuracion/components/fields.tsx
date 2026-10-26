'use client';

// C4-TRACE: shared field primitives so every configuration section renders the same controls.

type FieldGroupProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function FieldGroup({ label, htmlFor, hint, children, style }: FieldGroupProps) {
  return (
    <div className="admin-field-group" style={style}>
      <label className="admin-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="admin-field-help">{hint}</span>}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number';
  required?: boolean;
  style?: React.CSSProperties;
};

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = 'text',
  required,
  style,
}: TextFieldProps) {
  return (
    <FieldGroup label={label} htmlFor={id} hint={hint} style={style}>
      <input
        id={id}
        type={type}
        className="admin-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </FieldGroup>
  );
}

type TextAreaFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  rows?: number;
  style?: React.CSSProperties;
};

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  rows = 3,
  style,
}: TextAreaFieldProps) {
  return (
    <FieldGroup label={label} htmlFor={id} hint={hint} style={style}>
      <textarea
        id={id}
        className="admin-input"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </FieldGroup>
  );
}

type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  hint?: string;
  style?: React.CSSProperties;
};

export function SelectField({ id, label, value, onChange, options, hint, style }: SelectFieldProps) {
  return (
    <FieldGroup label={label} htmlFor={id} hint={hint} style={style}>
      <select
        id={id}
        className="admin-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </FieldGroup>
  );
}

type ToggleFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: React.CSSProperties;
};

export function ToggleField({ label, description, checked, onChange, style }: ToggleFieldProps) {
  return (
    <div className="admin-setting-row" style={style}>
      <div className="admin-setting-info">
        <div className="admin-setting-label">{label}</div>
        {description && <div className="admin-setting-desc">{description}</div>}
      </div>
      <label className="admin-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="admin-toggle-slider" />
      </label>
    </div>
  );
}
