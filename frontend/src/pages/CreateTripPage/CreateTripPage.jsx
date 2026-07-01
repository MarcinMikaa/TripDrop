import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripService } from '../../services/tripService';
import { friendshipService } from '../../services/FriendshipService';
import { swalError } from '../../utils/swal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './CreateTripPage.module.scss';

const STEPS = ['Podstawowe informacje', 'Uczestnicy', 'Podsumowanie'];

const CreateTripPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    friendshipService
      .getFriends()
      .then((data) => setFriends(data))
      .catch(() => {});
  }, []);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleParticipant = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    if (step === 0) {
      const errors = {};
      if (!form.name.trim()) errors.name = 'Nazwa wycieczki jest wymagana.';
      if (!form.startDate) errors.startDate = 'Data rozpoczęcia jest wymagana.';
      if (!form.endDate) errors.endDate = 'Data zakończenia jest wymagana.';
      if (form.startDate && form.endDate && form.startDate > form.endDate)
        errors.endDate = 'Data końcowa nie może być wcześniejsza niż startowa.';

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        participantIds: Array.from(selected),
      };
      const data = await tripService.create(payload);
      navigate(`/planner/${data.id}`);
    } catch (err) {
      await swalError('Błąd', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const selectedFriends = friends.filter((f) => selected.has(f.id));

  return (
    <div className={styles.wrapper}>
      <h1>Nowa wycieczka</h1>

      <div className={styles.steps}>
        {STEPS.map((label, i) => (
          <div key={i} className={styles.stepGroup}>
            <div className={styles.step}>
              <div className={`${styles.stepNum} ${i < step ? styles.done : i === step ? styles.active : styles.idle}`}>
                {i < step ? <FontAwesomeIcon icon="check" /> : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${i === step ? styles.activeLabel : ''}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={styles.stepLine} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Podstawowe informacje</p>

          <div className={styles.field}>
            <label htmlFor="name">Nazwa wycieczki *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="np. Majówka w Tatrach"
              value={form.name}
              onChange={handleFormChange}
              className={fieldErrors.endDate ? 'input-error' : ''}
              maxLength={200}
            />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="description">Opis (opcjonalny)</label>
            <textarea
              id="description"
              name="description"
              placeholder="Krótki opis planu wycieczki..."
              value={form.description}
              onChange={handleFormChange}
              rows={3}
            />
          </div>

          <div className={styles.dates}>
            <div className={styles.field}>
              <label htmlFor="startDate">Data rozpoczęcia *</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleFormChange} 
                className={fieldErrors.startDate ? 'input-error' : ''}
              />
              {fieldErrors.startDate && <p className="field-error">{fieldErrors.startDate}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="endDate">Data zakończenia *</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleFormChange}
                className={fieldErrors.name ? 'input-error' : ''}
              />
              {fieldErrors.endDate && <p className="field-error">{fieldErrors.endDate}</p>}
            </div>
          </div>

          <div className={styles.actions}>
            <span />
            <button className={styles.btnNext} onClick={handleNext}>
              Dalej
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Dodaj uczestników</p>

          {friends.length === 0 && (
            <p className={styles.noFriends}>
              Nie masz jeszcze znajomych. Dodaj ich w sekcji{' '}
              <span className={styles.link} onClick={() => navigate('/friends')}>
                Znajomi
              </span>
              .
            </p>
          )}

          {friends.map((f) => (
            <div key={f.id} className={styles.friendRow}>
              <div className={styles.friendAvatar}>{f.username[0].toUpperCase()}</div>
              <span className={styles.friendName}>{f.username}</span>
              <button
                className={`${styles.addBtn} ${selected.has(f.id) ? styles.added : ''}`}
                onClick={() => toggleParticipant(f.id)}>
                {selected.has(f.id) ? (
                  <>
                    <FontAwesomeIcon icon="check" /> Dodano
                  </>
                ) : (
                  'Dodaj'
                )}
              </button>
            </div>
          ))}

          <div className={styles.actions}>
            <button className={styles.btnBack} onClick={handleBack}>
              Wstecz
            </button>
            <button className={styles.btnNext} onClick={handleNext}>
              Dalej
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Podsumowanie</p>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Nazwa</span>
            <span className={styles.summaryVal}>{form.name}</span>
          </div>

          {form.description && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Opis</span>
              <span className={styles.summaryVal}>{form.description}</span>
            </div>
          )}

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Data rozpoczęcia</span>
            <span className={styles.summaryVal}>{formatDate(form.startDate)}</span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Data zakończenia</span>
            <span className={styles.summaryVal}>{formatDate(form.endDate)}</span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Uczestnicy</span>
            <div className={styles.chips}>
              {selectedFriends.length === 0 ? (
                <span className={styles.summaryVal}>Tylko ty</span>
              ) : (
                selectedFriends.map((f) => (
                  <span key={f.id} className={styles.chip}>
                    {f.username}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnBack} onClick={handleBack}>
              Wstecz
            </button>
            <button className={styles.btnSubmit} onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Tworzenie...' : 'Utwórz wycieczkę'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTripPage;
