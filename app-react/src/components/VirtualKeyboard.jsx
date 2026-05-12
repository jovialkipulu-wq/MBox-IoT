import React from 'react';

export default function VirtualKeyboard({
  show,
  variant,
  value,
  onKey,
  onClose,
}) {
  if (!show) return null;

  // variant: 'pin' | 'text' | 'admin'
  const isPin = variant === 'pin';

  // Layout alphanumérique demandé (Admin password)
  const isAdminNumericPassword = variant === 'admin';

  const rows = (() => {
    if (isAdminNumericPassword) {
      return [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['0', 'A', 'B', 'C', 'BACK'], // Ajout de BACK ici
      ];
    }

    if (isPin) {
      return [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['0', 'BACK'], // Ajout de BACK ici
      ];
    }

    return [
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['G', 'H', 'I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P', 'Q', 'R'],
      ['S', 'T', 'U', 'V', 'W', 'X'],
      ['Y', 'Z', 'SPACE', 'DOT', 'BACK'],
    ];
  })();

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
      <div className="vk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vk-header">
          <div className="vk-title" aria-hidden="true" style={{ display: 'none' }}>Clavier</div>
          <button className="vk-close" type="button" onClick={onClose} aria-label="Fermer le clavier">
            ✕
          </button>
        </div>

        <div className="vk-body">
          {rows.map((r) => renderRow(r))}
          {pinFooter}
        </div>
      </div>
    </div>
  );
}