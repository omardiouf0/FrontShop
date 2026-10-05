import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCheck, FiClock, FiDownload, FiX } from 'react-icons/fi';
import api, { API_URL } from '../api/axios';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 15;

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const annule = searchParams.get('statut') === 'annule';

  const [payment, setPayment] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!orderId || annule) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await api.get(`/api/payments/${orderId}`);
        if (cancelled) return;
        setPayment(res.data);
        if (res.data.statut === 'completee' || res.data.statut === 'echouee') return;
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || 'Impossible de vérifier le paiement');
      }
      if (!cancelled) setAttempts((a) => a + 1);
    };

    poll();
    timerRef.current = setInterval(() => {
      setAttempts((current) => {
        if (current >= MAX_POLLS) clearInterval(timerRef.current);
        else poll();
        return current;
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, [orderId, annule]);

  const downloadReceipt = () => {
    window.open(`${API_URL}/api/receipts/${orderId}?token=${localStorage.getItem('token')}`, '_blank');
  };

  if (!orderId) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <p>Référence de commande manquante.</p>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: 16 }}>Retour à la boutique</Link>
      </div>
    );
  }

  if (annule) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <div className="empty-state">
          <div className="empty-state-icon"><FiX size={40} /></div>
          <h3>Paiement annulé</h3>
          <p>Vous avez annulé le paiement sur PayTech. Votre commande #{orderId} reste en attente de paiement.</p>
          <Link to="/checkout" className="btn btn-primary" style={{ marginTop: 16 }}>Réessayer</Link>
        </div>
      </div>
    );
  }

  const statut = payment?.statut;

  return (
    <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
      {error && <p style={{ color: 'var(--danger, #e33)' }}>{error}</p>}

      {statut === 'completee' && (
        <div className="empty-state">
          <div className="empty-state-icon"><FiCheck size={40} /></div>
          <h3>Paiement confirmé !</h3>
          <p>Votre commande #{orderId} a bien été payée via {payment?.methode?.replace('_', ' ')}.</p>
          <p>Référence : <code>{payment?.reference}</code></p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={downloadReceipt}><FiDownload /> Télécharger le reçu</button>
            <Link to="/orders" className="btn btn-secondary">Voir mes commandes</Link>
          </div>
        </div>
      )}

      {statut === 'echouee' && (
        <div className="empty-state">
          <div className="empty-state-icon"><FiX size={40} /></div>
          <h3>Le paiement a échoué</h3>
          <p>Le paiement de la commande #{orderId} n'a pas abouti. Vous pouvez réessayer.</p>
          <Link to="/checkout" className="btn btn-primary" style={{ marginTop: 16 }}>Réessayer</Link>
        </div>
      )}

      {(!statut || statut === 'en_attente') && (
        <div className="empty-state">
          <div className="empty-state-icon"><FiClock size={40} /></div>
          <h3>Vérification du paiement…</h3>
          <p>
            {attempts >= MAX_POLLS
              ? "PayTech n'a pas encore confirmé ce paiement. Vous recevrez la confirmation dès sa réception ; consultez vos commandes dans quelques minutes."
              : 'Merci de patienter pendant que nous confirmons votre paiement PayTech.'}
          </p>
          <Link to="/orders" className="btn btn-secondary" style={{ marginTop: 16 }}>Voir mes commandes</Link>
        </div>
      )}
    </div>
  );
}