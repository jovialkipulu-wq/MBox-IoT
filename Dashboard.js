import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './Dashboard.css';

const API_BASE = 'http://localhost:5000/api';

/** Date du jour en local YYYY-MM-DD (évite les bugs UTC de toISOString). */
function localDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ───────── Sensor Card ───────── */
const Card = ({ title, value, unit, status, icon, loading }) => (
  <div className={`card ${status === 'danger' ? 'card-danger' : ''}`}>
    <div className="card-icon">{icon}</div>
    <h3>{title}</h3>
    <div className="card-value-row">
      {loading ? (
        <span className="value loading-pulse">--</span>
      ) : (
        <span className="value">{value}</span>
      )}
      <span className="unit">{unit}</span>
    </div>
    <div className={`status-dot ${status === 'ok' ? 'dot-ok' : status === 'danger' ? 'dot-danger' : 'dot-alert'}`}></div>
  </div>
);

/* ───────── Time Slot ───────── */
const TimeSlot = ({ time, reserved, reservedBy, selected, onClick, onCancel, isAdmin, isPast }) => (
  <button
    className={`slot ${reserved ? 'slot-reserved slot-clickable' : ''} ${selected ? 'slot-selected' : ''} ${isPast ? 'slot-past' : ''}`}
    disabled={isPast && !reserved}
    onClick={reserved ? onCancel : onClick}
  >
    <span className="slot-time">{time}</span>
    <span className="slot-status">
      {isPast && !reserved
        ? 'Passé'
        : reserved
        ? `Réservé${reservedBy ? ` — ${reservedBy}` : ''}`
        : 'Disponible'}
    </span>
    {reserved && !isPast && (
      <span className="slot-cancel-hint">{isAdmin ? '✕ Annuler (admin)' : '🔑 Cliquez pour annuler'}</span>
    )}
  </button>
);

/* ───────── Modal ───────── */
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

/* ───────── Main Dashboard ───────── */
function Dashboard() {
  const [dark, setDark] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminInput, setAdminInput] = useState('');

  // Réservations
  const [selectedDate, setSelectedDate] = useState(localDateISO);
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
  const [feedback, setFeedback] = useState(null);
  const dateInputRef = useRef(null);

  const openNativeDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      /* certains navigateurs refusent showPicker hors geste utilisateur */
    }
    el.focus();
    el.click();
  };

  // Admin
  const [allReservations, setAllReservations] = useState([]);

  // Historique capteurs
  const [history, setHistory] = useState([]);

  // ── Fetch sensor data ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/sensors/latest`);
        const json = await res.json();
        setData(json);
        setError(false);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch sensor history ──
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/sensors/history?sensor=temperature&count=60`);
        const json = await res.json();
        if (json.data) {
          const formatted = json.data.map((d) => ({
            time: d.time ? new Date(d.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            temperature: d.value,
          }));
          // Also fetch CO2
          const resCo2 = await fetch(`${API_BASE}/sensors/history?sensor=co2&count=60`);
          const jsonCo2 = await resCo2.json();
          if (jsonCo2.data) {
            jsonCo2.data.forEach((d, i) => {
              if (formatted[i]) formatted[i].co2 = d.value;
            });
          }
          setHistory(formatted);
        }
      } catch { /* silent */ }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch reservations for selected date ──
  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reservations?date=${selectedDate}`);
      const json = await res.json();
      setReservations(Array.isArray(json) ? json : []);
    } catch { /* silent */ }
  }, [selectedDate]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  useEffect(() => {
    const clampToTodayIfNeeded = () => {
      const today = localDateISO();
      setSelectedDate((prev) => (prev < today ? today : prev));
    };
    clampToTodayIfNeeded();
    const onVis = () => {
      if (document.visibilityState === 'visible') clampToTodayIfNeeded();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  // ── Fetch all reservations (admin) ──
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

  // ── Time slots ──
  const timeSlots = [
    { time: '08:00 – 09:00', start: '08:00:00', end: '09:00:00' },
    { time: '09:00 – 10:00', start: '09:00:00', end: '10:00:00' },
    { time: '10:00 – 11:00', start: '10:00:00', end: '11:00:00' },
    { time: '11:00 – 12:00', start: '11:00:00', end: '12:00:00' },
    { time: '12:00 – 13:00', start: '12:00:00', end: '13:00:00' },
    { time: '13:00 – 14:00', start: '13:00:00', end: '14:00:00' },
    { time: '14:00 – 15:00', start: '14:00:00', end: '15:00:00' },
    { time: '15:00 – 16:00', start: '15:00:00', end: '16:00:00' },
    { time: '16:00 – 17:00', start: '16:00:00', end: '17:00:00' },
    { time: '17:00 – 18:00', start: '17:00:00', end: '18:00:00' },
  ];

  // ── Créneau passé : jour entier avant aujourd'hui, ou aujourd'hui avec heure de fin dépassée ──
  const isSlotPast = (slot) => {
    const today = localDateISO();
    if (selectedDate < today) return true;
    if (selectedDate > today) return false;
    const now = new Date();
    const parts = slot.end.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const s = parts[2] ?? 0;
    const slotEnd = new Date();
    slotEnd.setHours(h, m, s, 0);
    return now > slotEnd;
  };

  // ── Check if slot is reserved ──
  const getSlotReservation = (slot) => {
    if (!Array.isArray(reservations)) return null;
    const slotStart = `${selectedDate}T${slot.start}`;
    return reservations.find((r) => {
      const rStart = r.start_time.replace(' ', 'T');
      return rStart.startsWith(slotStart.substring(0, 16));
    });
  };

  // ── Show feedback temporarily ──
  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // ── Handle booking ──
  const handleBookConfirm = async () => {
    if (!bookName.trim()) return showFeedback('Entrez votre nom', 'error');
    if (bookPin.length !== 4 || !/^\d{4}$/.test(bookPin)) return showFeedback('PIN : 4 chiffres', 'error');

    const slot = timeSlots[selectedSlot];
    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reserved_by: bookName.trim(),
          pin: bookPin,
          room: 'A',
          start_time: `${selectedDate}T${slot.start}`,
          end_time: `${selectedDate}T${slot.end}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Afficher le rappel du PIN
        setLastBookedPin(bookPin);
        setLastBookedSlot(slot.time);
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

  // ── Handle cancel (user with PIN) ──
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

  // ── Handle admin cancel ──
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

  // ── Admin login (via backend) ──
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

  // ── CO2 status ──
  const getCo2Status = (co2) => {
    if (!co2) return 'ok';
    if (co2 > 1000) return 'danger';
    if (co2 > 800) return 'alert';
    return 'ok';
  };

  const getCo2Label = (co2) => {
    if (!co2) return '--';
    return co2;
  };

  const getCo2Quality = (co2) => {
    if (!co2) return '';
    if (co2 < 600) return 'Excellent';
    if (co2 < 1000) return 'Correct';
    return 'Mauvais — Aérez !';
  };

  const lastUpdate = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString('fr-FR')
    : '--:--:--';

  const co2High = data?.co2 && data.co2 > 1000;

  return (
    <div className={`page ${dark ? 'dark' : ''}`}>

      {/* ─── Feedback toast ─── */}
      {feedback && (
        <div className={`toast toast-${feedback.type}`}>{feedback.msg}</div>
      )}

      {/* ─── CO2 Alert Banner ─── */}
      {co2High && (
        <div className="co2-alert-banner">
          <span>⚠️ CO₂ élevé ({data.co2} ppm) — Veuillez aérer la salle</span>
        </div>
      )}

      {/* ─── Top bar ─── */}
      <div className="topbar">
        <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Thème">
          {dark ? '☀️' : '🌙'}
        </button>
        {!isAdmin ? (
          <button className="admin-btn" onClick={() => setShowAdminLogin(true)}>
            🔒 Admin
          </button>
        ) : (
          <button className="admin-btn admin-active" onClick={() => setIsAdmin(false)}>
            🔓 Déconnexion
          </button>
        )}
      </div>

      {/* ─── Admin login modal ─── */}
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

      {/* ─── PIN reminder modal ─── */}
      <Modal show={showPinReminder} onClose={() => setShowPinReminder(false)} title="Réservation confirmée ✓">
        <div className="pin-reminder">
          <p className="pin-reminder-slot">{lastBookedSlot}</p>
          <p className="pin-reminder-label">Votre code PIN :</p>
          <div className="pin-reminder-code">{lastBookedPin}</div>
          <p className="pin-reminder-warn">Notez-le ! Il est nécessaire pour annuler votre réservation.</p>
        </div>
        <button className="modal-btn" onClick={() => setShowPinReminder(false)}>J'ai noté mon PIN</button>
      </Modal>

      {/* ====== SECTION 1 : BIENVENUE ====== */}
      <section className="hero">
        <div className="hero-glow"></div>
        <p className="hero-tag">Campus ICAM</p>
        <h1 className="hero-title">
          Bienvenue sur <span>MeetingBox</span>
        </h1>
        <p className="hero-sub">
          Votre salle connectée — consultez l'état en temps réel,
          vérifiez la qualité de l'air et réservez votre créneau en un clic.
        </p>
        <div className="hero-btns">
          <a href="#data" className="hero-cta">Voir les données ↓</a>
          <a href="#planning" className="hero-cta hero-cta-outline">Réserver un créneau</a>
        </div>
      </section>

      {/* ====== SECTION 2 : DONNÉES CAPTEURS ====== */}
      <section className="section" id="data">
        <h2 className="section-title">
          <span className="title-dot"></span>
          Données en direct
        </h2>
        <p className="section-sub">
          {error ? '❌ Connexion au serveur impossible' : `Mise à jour : ${lastUpdate}`}
        </p>

        <div className="grid grid-3">
          <Card
            icon="🌡️"
            title="Température"
            value={data?.temperature ?? '--'}
            unit="°C"
            status="ok"
            loading={loading}
          />
          <Card
            icon="🌬️"
            title="Qualité Air (CO₂)"
            value={getCo2Label(data?.co2)}
            unit={`ppm · ${getCo2Quality(data?.co2)}`}
            status={getCo2Status(data?.co2)}
            loading={loading}
          />
          <Card
            icon="👤"
            title="Présence"
            value={data?.presence ? 'Occupé' : 'Libre'}
            unit=""
            status={data?.presence ? 'alert' : 'ok'}
            loading={loading}
          />
        </div>

        {/* ── Historique graphique ── */}
        {history.length > 3 && (
          <div className="chart-section">
            <h3 className="chart-title">Historique récent</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                  <YAxis yAxisId="temp" domain={['auto', 'auto']} tick={{ fill: '#f59e0b', fontSize: 11 }} />
                  <YAxis yAxisId="co2" orientation="right" domain={['auto', 'auto']} tick={{ fill: '#3b82f6', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text)',
                    }}
                  />
                  <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={false} name="Température °C" />
                  <Line yAxisId="co2" type="monotone" dataKey="co2" stroke="#3b82f6" strokeWidth={2} dot={false} name="CO₂ ppm" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              <span className="chart-legend-item"><span className="chart-dot" style={{ background: '#f59e0b' }}></span> Température (°C)</span>
              <span className="chart-legend-item"><span className="chart-dot" style={{ background: '#3b82f6' }}></span> CO₂ (ppm)</span>
            </div>
          </div>
        )}
      </section>

      {/* ====== SECTION 3 : PLANNING ====== */}
      <section className="section" id="planning">
        <h2 className="section-title">
          <span className="title-dot"></span>
          Planning de la salle
        </h2>
        <p className="section-sub">Choisissez une date et un créneau disponible</p>

        <div className="date-picker-row">
          <span className="date-label">Date</span>
          <div className="date-picker-control">
            <input
              ref={dateInputRef}
              type="date"
              className="date-input-native-hidden"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              min={localDateISO()}
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              className="date-picker-open-btn"
              onClick={openNativeDatePicker}
              aria-label="Ouvrir le calendrier"
              title="Choisir la date"
            >
              <svg className="date-picker-open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
            <button
              type="button"
              className="date-display-btn"
              onClick={openNativeDatePicker}
            >
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
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
            return (
              <TimeSlot
                key={i}
                time={slot.time}
                reserved={reserved}
                reservedBy={reservation?.reserved_by}
                selected={selectedSlot === i}
                isAdmin={isAdmin}
                isPast={past}
                onClick={() => {
                  if (!reserved && !past) {
                    setSelectedSlot(i);
                    setShowBookModal(true);
                  }
                }}
                onCancel={() => {
                  if (isAdmin && reserved) {
                    handleAdminCancel(reservation.id);
                  } else if (reserved) {
                    setCancelTarget(reservation);
                    setShowCancelModal(true);
                  }
                }}
              />
            );
          })}
        </div>
      </section>

      {/* ─── Book modal ─── */}
      <Modal show={showBookModal} onClose={() => { setShowBookModal(false); setSelectedSlot(null); }} title="Réserver un créneau">
        {selectedSlot !== null && (
          <>
            <p className="modal-desc">
              <strong>{timeSlots[selectedSlot]?.time}</strong> — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <input
              type="text"
              className="modal-input"
              placeholder="Votre nom"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              className="modal-input"
              placeholder="Choisissez un PIN (4 chiffres)"
              maxLength={4}
              value={bookPin}
              onChange={(e) => setBookPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleBookConfirm()}
            />
            <p className="modal-hint">Ce PIN vous sera demandé pour annuler.</p>
            <button className="modal-btn" onClick={handleBookConfirm}>Confirmer la réservation</button>
          </>
        )}
      </Modal>

      {/* ─── Cancel modal ─── */}
      <Modal show={showCancelModal} onClose={() => { setShowCancelModal(false); setCancelPin(''); }} title="Annuler une réservation">
        {cancelTarget && (
          <>
            <p className="modal-desc">
              Créneau réservé par <strong>{cancelTarget.reserved_by}</strong>
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

      {/* ====== SECTION ADMIN ====== */}
      {isAdmin && (
        <section className="section admin-section" id="admin">
          <h2 className="section-title">
            <span className="title-dot dot-admin"></span>
            Panneau Administrateur
          </h2>
          <p className="section-sub">Gestion complète des réservations</p>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Salle</th>
                  <th>Date</th>
                  <th>Créneau</th>
                  <th>Réservé par</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allReservations.map((r) => (
                  <tr key={r.id} className={r.status === 'cancelled' ? 'row-cancelled' : ''}>
                    <td>{r.id}</td>
                    <td>{r.room}</td>
                    <td>{r.start_time?.split('T')[0]}</td>
                    <td>
                      {r.start_time?.split('T')[1]?.substring(0, 5)} – {r.end_time?.split('T')[1]?.substring(0, 5)}
                    </td>
                    <td>{r.reserved_by}</td>
                    <td>
                      <span className={`badge ${r.status === 'confirmed' ? 'badge-ok' : 'badge-cancel'}`}>
                        {r.status === 'confirmed' ? 'Confirmé' : 'Annulé'}
                      </span>
                    </td>
                    <td>
                      {r.status === 'confirmed' && (
                        <button className="btn-admin-cancel" onClick={() => handleAdminCancel(r.id)}>
                          Annuler
                        </button>
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

      {/* ====== FOOTER ====== */}
      <footer className="footer">
        <p>MeetingBox IoT — Campus ICAM © 2026</p>
      </footer>
    </div>
  );
}

export default Dashboard;
