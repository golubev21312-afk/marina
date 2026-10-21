import { useRef } from 'react';
import './SearchBar.css';

/** Поиск по названию изделия: поле-пилюля с лупой, крестик очищает. */
export default function SearchBar({ value, onChange }) {
  const inputRef = useRef(null);

  const clear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <label className={`search ${value ? 'has-value' : ''}`}>
      <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
      <input
        ref={inputRef}
        className="search__input"
        type="text"
        value={value}
        placeholder="Поиск по изделиям"
        aria-label="Поиск по изделиям"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && onChange('')}
      />
      <button type="button" className="search__clear" aria-label="Очистить поиск" onClick={clear}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </label>
  );
}
