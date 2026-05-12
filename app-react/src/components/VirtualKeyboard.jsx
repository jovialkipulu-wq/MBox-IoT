import React from 'react';

export default function VirtualKeyboard({
  show,
  variant,
  value,
  onKey,
  onClose,
}) {
  if (!show) return null;

  // Détection des modes
  const isPin = variant === 'pin';
  const isAdmin = variant === 'admin';

  // Point 1 : Layout AZERTY et organisation des lignes
  const rows = (() => {
    if (isAdmin) {
      return [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['A', 'B', 'C', '0', 'BACK', 'ENTER'],
      ];
    }
    if (isPin) {
      return [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['0', 'BACK', 'ENTER'],
      ];
    }
    // Mode Texte en AZERTY standard
    return [
      ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
      ['W', 'X', 'C', 'V', 'B', 'N', 'SPACE', 'DOT', 'BACK', 'ENTER'],
    ];
  })();

  const renderRow = (r, idx) => (
    <div className="vk-row" key={`row-${idx}`}>
      {r.map((k) => {
        // Touche EFFACER
        if (k === 'BACK') {
          return (
            <button key={k} className="vk-key vk-key-back" type="button" onClick={() => onKey({ type: 'back' })}>
              ⌫
            </button>
          );
        }
        if (k === 'ENTER') {
          return (
            <button key={k} className="vk-key vk-key-enter" type="button" onClick={() => onKey({ type: 'enter' })}>
              Entrée
            </button>
          );
        }
        // Touche ESPACE
        if (k === 'SPACE') {
          return (
            <button key={k} className="vk-key vk-key-wide" type="button" onClick={() => onKey({ type: 'char', char: ' ' })}>
              Espace
            </button>
          );
        }
        // Touche POINT
        if (k === 'DOT') {
          return (
            <button key={k} className="vk-key" type="button" onClick={() => onKey({ type: 'char', char: '.' })}>
              .
            </button>
          );
        }
        // Touches STANDARDS (Lettres/Chiffres)
        return (
          <button key={k} className="vk-key" type="button" onClick={() => onKey({ type: 'char', char: k })}>
            {k}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="vk-overlay" role="dialog" aria-modal="true">
      <div className="vk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vk-header">
          
          {/* Point 5 : Zone d'affichage pour voir ce qu'on écrit */}
          <div className="vk-preview-area">
            <span className="vk-preview-label">
              {(isPin || isAdmin) ? 'PIN' : 'SAISIE'} :
            </span>
            <span className="vk-preview-value">
              {/* Masque par des points si c'est un code/pass, sinon affiche le texte */}
              {(isPin || isAdmin) ? String(value || '').replace(/./g, '•') : (value || '')}
            </span>
          </div>

          <button className="vk-close" type="button" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="vk-body">
          {rows.map((r, idx) => renderRow(r, idx))}
        </div>
      </div>
    </div>
  );
}