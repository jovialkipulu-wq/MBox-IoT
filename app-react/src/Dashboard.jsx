import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Dashboard.css';
import StatusBar from './components/StatusBar.jsx';
import VirtualKeyboard from './components/VirtualKeyboard.jsx';

const API_BASE = 'http://localhost:5000/api';

const BUSINESS_START = 8 * 60;
const BUSINESS_END = 18 * 60;
const DEFAULT_SLOT_MINUTES = 60;

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const formatSlotLabel = (startMin, endMin) =>
  `${minutesToTime(startMin)} – ${minutesToTime(endMin)}`;

const Card = ({ title, value, unit, status, icon, loading }) => (
  <div className={`card ${status === 'danger' ? 'card-danger' : ''}`}>
    <div className="card-icon">{icon}</div>
    <h3>{title}</h3>
    <div className="card-value-row">
      {loading ? <span className="value loading-pulse">--</span> : <span className="value">{value}</span>}
      <span className="unit">{unit}</span>
    </div>
    <div className={`status-dot ${status === 'ok' ? 'dot-ok' : status === 'danger' ? 'dot-danger' : 'dot-alert'}`}></div>
  </div>
);

const TimeSlot = ({ time, reserved, reservedBy, selected, onClick, onCancel, isAdmin, isPast }) => (
  <button
    className={`slot ${reserved ? 'slot-reserved slot-clickable' : ''} ${selected ? 'slot-selected' : ''} ${isPast ? 'slot-past' : ''}`}
    disabled={isPast && !reserved}
    onClick={reserved ? onCancel : onClick}
  >
    <span className="slot-time">{time}</span>
    <span className="slot-status">
      {isPast && !reserved ? 'Passé' : reserved ? `Réservé${reservedBy ? ` — ${reservedBy}` : ''}` : 'Disponible'}
    </span>
    {reserved && !isPast && (
      <span className="slot-cancel-hint">{isAdmin ? '✕ Annuler (admin)' : '🔑 Cliquez pour annuler'}</span>
    )}
  </button>
);

const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3 className="modal-title">{title}</h3>
        {children}
      </div>
    </div>
  );
};

function Dashboard() {
  const SECTION_IDS = ['hero', 'data', 'planning'];
  const AUTO_SCROLL_MS = 10_000;

  const [autoScrollIndex, setAutoScrollIndex] = useState(0);

  const scrollToSectionId = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sectionIds = SECTION_IDS;

    const goToIndex = (index) => {
      const id = sectionIds[index % sectionIds.length];
      scrollToSectionId(id);
    };

    // Démarre sur la bonne section dès le montage
    goToIndex(autoScrollIndex);

    const intervalId = window.setInterval(() => {
      setAutoScrollIndex((prev) => {
        const next = (prev + 1) % sectionIds.length;
        goToIndex(next);
        return next;
      });
    }, AUTO_SCROLL_MS);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AUTO_SCROLL_MS, SECTION_IDS, autoScrollIndex, scrollToSectionId]);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminInput, setAdminInput] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reservations, setReservations] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPinReminder, setShowPinReminder] = useState(false);
  const [lastBookedPin, setLastBookedPin] = useState('');
  const [lastBookedSlot, setLastBookedSlot] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [bookName, setBookName] = useState('');
  const [bookPin, setBookPin] = useState('');
  const [cancelPin, setCancelPin] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardVariant, setKeyboardVariant] = useState('text');
  const [keyboardTarget, setKeyboardTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [bookStartTime, setBookStartTime] = useState('08:00');
  const [bookEndTime, setBookEndTime] = useState('09:00');

  const [allReservations, setAllReservations] = useState([]);

  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reservations?date=${selectedDate}`);
      const json = await res.json();
      setReservations(Array.isArray(json) ? json : []);
    } catch { /* silent */ }
  }, [selectedDate]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchAll = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservations/admin/all`);
        const json = await res.json();
        setAllReservations(Array.isArray(json) ? json : []);
      } catch { /* silent */ }
    };
    fetchAll();
  }, [isAdmin, reservations]);

  const generateTimeSlots = useCallback(() => {
    const slots = [];
    const dayReservations = (reservations || [])
      .filter((r) => r.status === 'confirmed')
      .map((r) => {
        const startStr = r.start_time?.replace(' ', 'T') || '';
        const endStr = r.end_time?.replace(' ', 'T') || '';
        const startDate = startStr.split('T')[0];
        if (startDate !== selectedDate) return null;
        const startMin = timeToMinutes(startStr.split('T')[1]?.substring(0, 5) || '00:00');
        const endMin = timeToMinutes(endStr.split('T')[1]?.substring(0, 5) || '00:00');
        return { startMin, endMin, reservation: r };
      })
      .filter(Boolean)
      .sort((a, b) => a.startMin - b.startMin);

    let current = BUSINESS_START;
    let resIdx = 0;

    while (current < BUSINESS_END) {
      const nextRes = dayReservations[resIdx];

      if (nextRes && current >= nextRes.startMin && current < nextRes.endMin) {
        slots.push({
          time: formatSlotLabel(nextRes.startMin, nextRes.endMin),
          startMin: nextRes.startMin,
          endMin: nextRes.endMin,
          start: `${minutesToTime(nextRes.startMin)}:00`,
          end: `${minutesToTime(nextRes.endMin)}:00`,
          reserved: true,
          reservation: nextRes.reservation,
        });
        current = nextRes.endMin;
        resIdx++;
      } else if (nextRes && current < nextRes.startMin) {
        const slotEnd = Math.min(nextRes.startMin, current + DEFAULT_SLOT_MINUTES, BUSINESS_END);
        slots.push({
          time: formatSlotLabel(current, slotEnd),
          startMin: current,
          endMin: slotEnd,
          start: `${minutesToTime(current)}:00`,
          end: `${minutesToTime(slotEnd)}:00`,
          reserved: false,
          reservation: null,
        });
        current = slotEnd;
      } else {
        const slotEnd = Math.min(current + DEFAULT_SLOT_MINUTES, BUSINESS_END);
        slots.push({
          time: formatSlotLabel(current, slotEnd),
          startMin: current,
          endMin: slotEnd,
          start: `${minutesToTime(current)}:00`,
          end: `${minutesToTime(slotEnd)}:00`,
          reserved: false,
          reservation: null,
        });
        current = slotEnd;
      }
    }

    return slots;
  }, [reservations, selectedDate]);

  const timeSlots = useMemo(() => generateTimeSlots(), [generateTimeSlots]);

  useEffect(() => {
    const nextSlot = timeSlots.find((s) => !s.reserved) || null;
    if (nextSlot) {
      setBookStartTime(minutesToTime(nextSlot.startMin));
      setBookEndTime(minutesToTime(nextSlot.endMin));
    }
  }, [selectedDate, timeSlots]);

  const getNextAvailableSlot = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of timeSlots) {
      if (slot.reserved) continue;
      if (selectedDate === today && slot.endMin <= nowMinutes) continue;
      return slot;
    }
    return timeSlots.find((s) => !s.reserved) || null;
  }, [timeSlots, selectedDate]);


  const isSlotPast = (slot) => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate !== today) return false;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return nowMinutes >= slot.endMin;
  };

  const getSlotReservation = (slot) => {
    if (!Array.isArray(reservations)) return null;
    return slot.reservation || null;
  };

  const hasOverlap = (startMin, endMin, excludeReservationId = null) => {
    return reservations.some((r) => {
      if (r.status !== 'confirmed') return false;
      if (excludeReservationId && r.id === excludeReservationId) return false;
      const rStartStr = r.start_time?.replace(' ', 'T') || '';
      const rEndStr = r.end_time?.replace(' ', 'T') || '';
      const rDate = rStartStr.split('T')[0];
      if (rDate !== selectedDate) return false;
      const rStartMin = timeToMinutes(rStartStr.split('T')[1]?.substring(0, 5) || '00:00');
      const rEndMin = timeToMinutes(rEndStr.split('T')[1]?.substring(0, 5) || '00:00');
      return startMin < rEndMin && endMin > rStartMin;
    });
  };

  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const openBookModal = (slot) => {
    setBookStartTime(minutesToTime(slot.startMin));
    setBookEndTime(minutesToTime(slot.endMin));
    setSelectedSlot(slot);
    setShowBookModal(true);
  };

  const handleBookConfirm = async () => {
    if (!bookName.trim()) return showFeedback('Entrez votre nom', 'error');
    if (bookPin.length !== 4 || !/^\d{4}$/.test(bookPin)) return showFeedback('PIN : 4 chiffres', 'error');

    const startMin = timeToMinutes(bookStartTime);
    const endMin = timeToMinutes(bookEndTime);

    if (endMin <= startMin) return showFeedback("L'heure de fin doit être après l'heure de début", 'error');
    if (startMin < BUSINESS_START || endMin > BUSINESS_END) {
      return showFeedback('Les réservations sont limitées de 08:00 à 18:00', 'error');
    }
    if (hasOverlap(startMin, endMin)) {
      return showFeedback('Ce créneau chevauche une réservation existante', 'error');
    }

    const startIso = `${selectedDate}T${bookStartTime}:00`;
    const endIso = `${selectedDate}T${bookEndTime}:00`;

    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reserved_by: bookName.trim(),
          pin: bookPin,
          room: 'A',
          start_time: startIso,
          end_time: endIso,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setLastBookedPin(bookPin);
        setLastBookedSlot(formatSlotLabel(startMin, endMin));
        setShowBookModal(false);
        setShowPinReminder(true);
        setBookName('');
        setBookPin('');
        setSelectedSlot(null);
        fetchReservations();
      } else {
        showFeedback(json.error || 'Erreur', 'error');
      }
    } catch { showFeedback('Serveur injoignable', 'error'); }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      const res = await fetch(`${API_BASE}/reservations/${cancelTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cancelPin }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback('Réservation annulée');
        setShowCancelModal(false);
        setCancelPin('');
        setCancelTarget(null);
        fetchReservations();
      } else {
        showFeedback(json.error || 'Erreur', 'error');
      }
    } catch { showFeedback('Serveur injoignable', 'error'); }
  };

  const openKeyboard = (variant, target) => {
    setKeyboardVariant(variant);
    setKeyboardTarget(target);
    setKeyboardOpen(true);
  };

  const closeKeyboard = () => {
    setKeyboardOpen(false);
    setKeyboardTarget(null);
  };

  const handleKeyboardKey = ({ type, char }) => {
    if (!keyboardTarget) return;
    const currentValue = keyboardTarget === 'pin' ? bookPin : bookName;
    let nextValue = currentValue;

    if (type === 'back') {
      nextValue = currentValue.slice(0, -1);
    } else if (type === 'char') {
      if (keyboardTarget === 'pin') {
        if (!/^[0-9]$/.test(char) || currentValue.length >= 4) return;
        nextValue = currentValue + char;
      } else {
        nextValue = currentValue + char;
      }
    }

    if (keyboardTarget === 'pin') {
      setBookPin(nextValue);
    } else {
      setBookName(nextValue);
    }
  };

  const handleAdminCancel = async (id) => {
    if (!window.confirm('Annuler cette réservation (admin) ?')) return;
    try {
      const res = await fetch(`${API_BASE}/reservations/admin/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showFeedback('Annulée par admin');
        fetchReservations();
      }
    } catch { showFeedback('Erreur', 'error'); }
  };

  const handleAdminLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminInput }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAdmin(true);
        setShowAdminLogin(false);
        setAdminInput('');
        showFeedback('Mode administrateur activé');
      } else {
        showFeedback('Mot de passe incorrect', 'error');
      }
    } catch { showFeedback('Serveur injoignable', 'error'); }
  };

  return (
    <div className="page">
      {feedback && (
        <div className={`toast toast-${feedback.type}`}>{feedback.msg}</div>
      )}

      <div className="topbar">
        {!isAdmin ? (
          <button className="admin-btn" onClick={() => setShowAdminLogin(true)}>🔒 Admin</button>
        ) : (
          <button className="admin-btn admin-active" onClick={() => setIsAdmin(false)}>🔓 Déconnexion</button>
        )}
      </div>

      <Modal show={showAdminLogin} onClose={() => setShowAdminLogin(false)} title="Accès Administrateur">
        <p className="modal-desc">Entrez le mot de passe administrateur</p>
        <input
          type="password"
          className="modal-input"
          placeholder="Mot de passe"
          value={adminInput}
          onChange={(e) => setAdminInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          autoFocus
        />
        <button className="modal-btn" onClick={handleAdminLogin}>Connexion</button>
      </Modal>

      <Modal show={showPinReminder} onClose={() => setShowPinReminder(false)} title="Réservation confirmée ✓">
        <div className="pin-reminder">
          <p className="pin-reminder-slot">{lastBookedSlot}</p>
          <p className="pin-reminder-label">Votre code PIN :</p>
          <div className="pin-reminder-code">{lastBookedPin}</div>
          <p className="pin-reminder-warn">Notez-le ! Il est nécessaire pour annuler votre réservation.</p>
        </div>
        <button className="modal-btn" onClick={() => setShowPinReminder(false)}>J'ai noté mon PIN</button>
      </Modal>

      <section className="hero">
        <div className="hero-glow"></div>
        <p className="hero-tag">Campus ICAM</p>
        <h1 className="hero-title">Bienvenue sur <span>MeetingBox</span></h1>
        <p className="hero-sub">
          Votre salle connectée — consultez l'état en temps réel,
          vérifiez la qualité de l'air et réservez votre créneau en un clic.
        </p>
        <div className="hero-btns">
          <a href="#data" className="hero-cta">Voir les données ↓</a>
          <a href="#planning" className="hero-cta hero-cta-outline">Réserver un créneau</a>
        </div>
      </section>

      <section className="section section-wide" id="data">
        <h2 className="section-title"><span className="title-dot"></span>Données en direct</h2>
        <p className="section-sub">Tableau de bord IoT — ThingsBoard</p>
        <div className="tb-iframe-wrap">
          <iframe
            src="https://thingsboard.icam.technology/dashboard/58cd7d80-401c-11f1-b38a-4df4ced3e7cf?publicId=ac4bdf80-c9e6-11f0-b38a-4df4ced3e7cf&title=false&header=false&toolbar=false&dash-breadcrumbs=false&hideToolbar=true&displayHeader=false&sandbox=true"
            title="ThingsBoard Dashboard"
            className="tb-iframe"
            allowFullScreen
          />
        </div>
      </section>

      <section className="section" id="planning">
        <h2 className="section-title"><span className="title-dot"></span>Planning de la salle</h2>
        <p className="section-sub">Choisissez une date et un créneau disponible</p>

        <div className="date-picker-row">
          <label className="date-label">📅 Date :</label>
          <input
            type="date"
            className="date-input"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlot(null);
            }}
            min={new Date().toISOString().split('T')[0]}
          />
          <span className="date-display">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </span>

          <div className="time-picker-group">
            <label className="time-label">🕐 Début :</label>
            <input
              type="time"
              className="time-input"
              value={bookStartTime}
              onChange={(e) => setBookStartTime(e.target.value)}
              min="08:00"
              max="17:59"
            />
            <label className="time-label">🕐 Fin :</label>
            <input
              type="time"
              className="time-input"
              value={bookEndTime}
              onChange={(e) => setBookEndTime(e.target.value)}
              min="08:01"
              max="18:00"
            />
            <button
              className="book-btn-inline"
              onClick={() => {
                const startMin = timeToMinutes(bookStartTime);
                const endMin = timeToMinutes(bookEndTime);
                if (endMin <= startMin) {
                  return showFeedback("L'heure de fin doit être après l'heure de début", 'error');
                }
                if (hasOverlap(startMin, endMin)) {
                  return showFeedback('Ce créneau chevauche une réservation existante', 'error');
                }
                setSelectedSlot({ startMin, endMin, time: formatSlotLabel(startMin, endMin) });
                setShowBookModal(true);
              }}
            >
              Réserver
            </button>
          </div>
        </div>

        <div className="legend">
          <div className="legend-item"><span className="legend-dot legend-available"></span> Disponible</div>
          <div className="legend-item"><span className="legend-dot legend-reserved"></span> Réservé</div>
          <div className="legend-item"><span className="legend-dot legend-selected"></span> Sélectionné</div>
          <div className="legend-item"><span className="legend-dot legend-past"></span> Passé</div>
        </div>

        <div className="slots-grid">
          {timeSlots.map((slot, i) => {
            const reservation = getSlotReservation(slot);
            const reserved = !!reservation;
            const past = isSlotPast(slot);
            const isSelected = selectedSlot &&
              selectedSlot.startMin === slot.startMin &&
              selectedSlot.endMin === slot.endMin;
            return (
              <TimeSlot
                key={i}
                time={slot.time}
                reserved={reserved}
                reservedBy={reservation?.reserved_by}
                selected={isSelected}
                isAdmin={isAdmin}
                isPast={past}
                onClick={() => {
                  if (!reserved && !past) openBookModal(slot);
                }}
                onCancel={() => {
                  if (isAdmin && reserved) handleAdminCancel(reservation.id);
                  else if (reserved) {
                    setCancelTarget(reservation);
                    setShowCancelModal(true);
                  }
                }}
              />
            );
          })}
        </div>
      </section>

      <Modal show={showBookModal} onClose={() => { setShowBookModal(false); setSelectedSlot(null); closeKeyboard(); }} title="Réserver un créneau">
        <p className="modal-desc">
          <strong>{formatSlotLabel(timeToMinutes(bookStartTime), timeToMinutes(bookEndTime))}</strong>
          {' — '}
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        <div className="modal-time-row">
          <div className="modal-time-field">
            <label htmlFor="book-start">Heure de début</label>
            <input
              id="book-start"
              type="time"
              className="modal-input modal-time-input"
              value={bookStartTime}
              onChange={(e) => {
                const newStart = e.target.value;
                setBookStartTime(newStart);
                const newStartMin = timeToMinutes(newStart);
                const endMin = timeToMinutes(bookEndTime);
                if (endMin <= newStartMin) {
                  setBookEndTime(minutesToTime(Math.min(newStartMin + DEFAULT_SLOT_MINUTES, BUSINESS_END)));
                }
              }}
              min="08:00"
              max="17:59"
              autoFocus
            />
          </div>
          <div className="modal-time-field">
            <label htmlFor="book-end">Heure de fin</label>
            <input
              id="book-end"
              type="time"
              className="modal-input modal-time-input"
              value={bookEndTime}
              onChange={(e) => {
                const newEnd = e.target.value;
                const newEndMin = timeToMinutes(newEnd);
                const startMin = timeToMinutes(bookStartTime);
                if (newEndMin > startMin) setBookEndTime(newEnd);
              }}
              min="08:01"
              max="18:00"
            />
          </div>
        </div>

        <input
          type="text"
          className="modal-input"
          placeholder="Votre nom"
          value={bookName}
          readOnly
          onClick={() => openKeyboard('text', 'name')}
          onFocus={() => openKeyboard('text', 'name')}
        />
        <input
          type="password"
          className="modal-input"
          placeholder="Choisissez un PIN (4 chiffres)"
          maxLength={4}
          value={bookPin}
          readOnly
          onClick={() => openKeyboard('pin', 'pin')}
          onFocus={() => openKeyboard('pin', 'pin')}
        />
        <p className="modal-hint">Ce PIN vous sera demandé pour annuler.</p>
        <button className="modal-btn" onClick={handleBookConfirm}>Confirmer la réservation</button>
      </Modal>

      <Modal show={showCancelModal} onClose={() => { setShowCancelModal(false); setCancelPin(''); }} title="Annuler une réservation">
        {cancelTarget && (
          <>
            <p className="modal-desc">
              Créneau <strong>{cancelTarget.start_time?.split('T')[1]?.substring(0, 5)} – {cancelTarget.end_time?.split('T')[1]?.substring(0, 5)}</strong>
              <br />
              Réservé par <strong>{cancelTarget.reserved_by}</strong>
            </p>
            <input
              type="password"
              className="modal-input"
              placeholder="Votre code PIN"
              maxLength={4}
              value={cancelPin}
              onChange={(e) => setCancelPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleCancelConfirm()}
              autoFocus
            />
            <button className="modal-btn modal-btn-danger" onClick={handleCancelConfirm}>Confirmer l'annulation</button>
          </>
        )}
      </Modal>

      <VirtualKeyboard
        show={keyboardOpen}
        variant={keyboardVariant}
        value={keyboardTarget === 'pin' ? bookPin : bookName}
        onKey={handleKeyboardKey}
        onClose={closeKeyboard}
      />

      {isAdmin && (
        <section className="section admin-section" id="admin">
          <h2 className="section-title"><span className="title-dot dot-admin"></span>Panneau Administrateur</h2>
          <p className="section-sub">Gestion complète des réservations</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Salle</th><th>Date</th><th>Créneau</th><th>Réservé par</th><th>Statut</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allReservations.map((r) => (
                  <tr key={r.id} className={r.status === 'cancelled' ? 'row-cancelled' : ''}>
                    <td>{r.id}</td>
                    <td>{r.room}</td>
                    <td>{r.start_time?.split('T')[0]}</td>
                    <td>{r.start_time?.split('T')[1]?.substring(0, 5)} – {r.end_time?.split('T')[1]?.substring(0, 5)}</td>
                    <td>{r.reserved_by}</td>
                    <td>
                      <span className={`badge ${r.status === 'confirmed' ? 'badge-ok' : 'badge-cancel'}`}>
                        {r.status === 'confirmed' ? 'Confirmé' : 'Annulé'}
                      </span>
                    </td>
                    <td>
                      {r.status === 'confirmed' && (
                        <button className="btn-admin-cancel" onClick={() => handleAdminCancel(r.id)}>Annuler</button>
                      )}
                    </td>
                  </tr>
                ))}
                {allReservations.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>Aucune réservation</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <StatusBar />

      <footer className="footer">
        <p>MeetingBox IoT — Campus ICAM © 2026</p>
      </footer>
    </div>
  );
}

export default Dashboard;
