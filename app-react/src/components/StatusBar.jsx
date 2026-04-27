import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const STATUS_CONFIG = {
  free: {
    label: 'SALLE LIBRE',
    sub: 'Réservez votre créneau',
    className: 'free',
  },
  reserved: {
    label: 'CRÉNEAU RÉSERVÉ',
    sub: 'En attente de présence',
    className: 'reserved',
  },
  occupied: {
    label: 'OCCUPÉ',
    sub: '',
    className: 'occupied',
  },
};

export default function StatusBar() {
  const [status, setStatus] = useState('free');
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [gracePeriod, setGracePeriod] = useState(15);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/room/status`);
      const json = await res.json();
      if (json && json.status) {
        setStatus(json.status);
        setReservation(json.reservation || null);
        setGracePeriod(json.grace_period_minutes || 15);
        // Initialiser le compte à rebours si on est en mode reserved
        if (json.status === 'reserved' && json.minutes_until_forfeit > 0) {
          setCountdown(Math.ceil(json.minutes_until_forfeit * 60));
        } else {
          setCountdown(0);
        }
      }
    } catch {
      // En cas d'erreur réseau, on garde le dernier état connu
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compte à rebours visuel (mise à jour chaque seconde)
  useEffect(() => {
    if (status !== 'reserved' || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, countdown]);

  // Afficher le bouton scroll-to-top uniquement en bas de page
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      // Seuil : 100px du bas
      setShowScrollBtn(scrollTop + clientHeight >= scrollHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Vérification initiale
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s.toString().padStart(2, '0')}s`;
  };

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.free;

  return (
    <div className={`status-bar ${config.className} ${loading ? 'status-loading' : ''}`}>
      <div className="status-bar-content">
        <div className="status-bar-text">
          <span className="status-bar-label">{config.label}</span>
          {config.sub && (
            <span className="status-bar-sub"> — {config.sub}</span>
          )}
          {status === 'reserved' && countdown > 0 && (
            <span className="status-bar-countdown">
              {' '}⏱️ Il vous reste {formatCountdown(countdown)} pour arriver
            </span>
          )}
          {status === 'reserved' && countdown === 0 && (
            <span className="status-bar-countdown status-bar-urgent">
              {' '}⏱️ Délai dépassé — annulation imminente
            </span>
          )}
        </div>
        {showScrollBtn && (
          <button
            className="scroll-top-btn"
            onClick={scrollToTop}
            aria-label="Remonter en haut de la page"
            title="Remonter"
          >
            ↑
          </button>
        )}
      </div>
    </div>
  );
}

