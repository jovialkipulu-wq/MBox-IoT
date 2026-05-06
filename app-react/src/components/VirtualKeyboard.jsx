import React from 'react';

const keysRow = (arr) => (
  <div className="vk-row">{arr.map((k) => k === 'BACK' ? (
    <button key={k} className="vk-key vk-key-back" type="button">⌫</button>
  ) : (
    <button key={k} className="vk-key" type="button">{k}</button>
  ))}</div>
);

export default function VirtualKeyboard({
  show,
  variant,
  value,
  onKey,
  onClose,
}) {
  if (!show) return null;

  // variant: 'pin' | 'text'
  const isPin = variant === 'pin';

  const rows = isPin
    ? [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['0'],
      ]
    : [
        ['A', 'B', 'C', 'D', 'E', 'F'],
        ['G', 'H', 'I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P', 'Q', 'R'],
        ['S', 'T', 'U', 'V', 'W', 'X'],
        ['Y', 'Z', 'SPACE', 'DOT', 'BACK'],
      ];

  const renderRow = (r) => (
    <div className="vk-row" key={r.join('_') + '_row'}>
      {r.map((k) => {
        if (k === 'BACK') {
          return (
            <button
              key={k}
              className="vk-key vk-key-back"
              type="button"
              onClick={() => onKey({ type: 'back' })}
            >
              ⌫
            </button>
          );
        }
        if (k === 'SPACE') {
          return (
            <button
              key={k}
              className="vk-key vk-key-wide"
              type="button"
              onClick={() => onKey({ type: 'char', char: ' ' })}
            >
              Espace
            </button>
          );
        }
        if (k === 'DOT') {
          return (
            <button
              key={k}
              className="vk-key"
              type="button"
              onClick={() => onKey({ type: 'char', char: '.' })}
            >
              .
            </button>
          );
        }
        return (
          <button
            key={k}
            className="vk-key"
            type="button"
            onClick={() => onKey({ type: 'char', char: k })}
          >
            {k}
          </button>
        );
      })}
    </div>
  );

  const pinFooter = isPin ? (
    <div className="vk-footer">PIN: {String(value || '').padEnd(4, '•')}</div>
  ) : null;

  return (
    <div className="vk-overlay" role="dialog" aria-modal="true">
      <div className="vk-modal">
        <div className="vk-header">
          <div className="vk-title">Clavier</div>
          <button className="vk-close" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="vk-body">
          {rows.map((r) => renderRow(r))}
          {pinFooter}
        </div>
      </div>
    </div>
  );
}

