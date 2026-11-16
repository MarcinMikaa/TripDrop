import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tripService } from '../../services/TripService';
import { friendshipService } from '../../services/FriendshipService';
import useAuth from '../../hooks/useAuth';
import TripPanel from '../../components/TripPanel/TripPanel';
import TripDetailsFields from '../../components/TripPanel/TripDetailsFields';
import TripPreviewCard from '../../components/TripPanel/TripPreviewCard';
import ParticipantPicker from '../../components/TripPanel/ParticipantPicker';
import { emptyTripForm, formToPayload, validateTripForm } from '../../components/TripPanel/tripForm';
import panel from '../../components/TripPanel/TripPanel.module.scss';
import styles from './CreateTripPage.module.scss';

const DETAILS_FORM_ID = 'create-trip-details';

const STEPS = [
  { key: 'details', label: 'Podstawy', step: 1 },
  { key: 'people', label: 'Uczestnicy', step: 2 },
];

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className={panel.icon}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className={panel.icon}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const CreateTripPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState('details');
  const [form, setForm] = useState(emptyTripForm);
  const [showErrors, setShowErrors] = useState(false);
  const [friends, setFriends] = useState({ status: 'loading', items: [] });
  const [selected, setSelected] = useState(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    friendshipService
      .getFriends()
      .then((items) => {
        if (!cancelled) setFriends({ status: 'ready', items });
      })
      .catch(() => {
        if (!cancelled) setFriends({ status: 'error', items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const validation = validateTripForm(form, { datesRequired: true });
  const detailsValid = Object.keys(validation).length === 0;
  const errors = showErrors ? validation : {};

  const handleFieldChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null);
  };

  const goToPeople = () => {
    setShowErrors(true);
    if (!detailsValid) return;
    setStep('people');
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    goToPeople();
  };

  const handleTabChange = (key) => {
    if (key === 'people') goToPeople();
    else setStep('details');
  };

  const toggleFriend = (friend) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(friend.id)) next.delete(friend.id);
      else next.add(friend.id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!detailsValid) {
      setShowErrors(true);
      setStep('details');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await tripService.create({ ...formToPayload(form), participantIds: [...selected] });
      navigate(`/planner/${created.id}`);
    } catch (err) {
      setSubmitError(err.message || 'Nie udało się utworzyć wyprawy. Spróbuj ponownie.');
      setIsSubmitting(false);
    }
  };

  const chosenFriends = friends.items.filter((friend) => selected.has(friend.id));
  const people = [...(user?.id ? [{ id: user.id, username: user.username }] : []), ...chosenFriends];
  const names = chosenFriends.map((friend) => `@${friend.username}`).join(', ');

  const tabs = STEPS.map((item) => ({
    ...item,
    done: item.key === 'details' && step !== 'details' && detailsValid,
  }));

  let peopleSummary = 'Na razie tylko Ty. Znajomych dodasz też później w Zarządzaj.';
  if (chosenFriends.length === 1) peopleSummary = `Zaproszenie dostanie ${names}.`;
  if (chosenFriends.length > 1) peopleSummary = `Zaproszenie dostaną ${names}.`;

  const footerActions =
    step === 'details' ? (
      <>
        <Link to="/trips" className={panel.ghostBtn}>
          Anuluj
        </Link>
        <button type="submit" form={DETAILS_FORM_ID} className={panel.primaryBtn}>
          Dalej: uczestnicy
          <ArrowRight />
        </button>
      </>
    ) : (
      <>
        <button type="button" className={panel.ghostBtn} onClick={() => setStep('details')} disabled={isSubmitting}>
          <ArrowLeft />
          Wstecz
        </button>
        <button type="button" className={panel.primaryBtn} onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Tworzenie...' : 'Utwórz i otwórz planer'}
          {!isSubmitting && <ArrowRight />}
        </button>
      </>
    );

  return (
    <TripPanel
      eyebrow="Nowa wyprawa"
      title="Dokąd tym razem?"
      tabs={tabs}
      activeTab={step}
      onTabChange={handleTabChange}
      tabsLabel="Kroki tworzenia wyprawy"
      currentType="step"
      aside={
        <TripPreviewCard
          label="Tak będzie wyglądać na liście"
          name={form.name}
          startDate={form.startDate}
          endDate={form.endDate}
          people={people}
          pointCount={0}
        />
      }
      alert={submitError}
      footerNote={step === 'details' ? 'Krok 1 z 2' : 'Krok 2 z 2'}
      footerActions={footerActions}>
      {step === 'details' ? (
        <form id={DETAILS_FORM_ID} onSubmit={handleDetailsSubmit} noValidate>
          <TripDetailsFields idPrefix="create-trip" value={form} errors={errors} onChange={handleFieldChange} />
        </form>
      ) : (
        <>
          <p className={panel.intro}>Zaznacz znajomych. Zaproszenie dostaną od razu po utworzeniu wyprawy.</p>

          {friends.status === 'loading' && <p className={panel.hint}>Wczytywanie znajomych...</p>}

          {friends.status === 'error' && (
            <p className={panel.error}>
              Nie udało się wczytać znajomych. Wyprawę utworzysz i tak, a osoby dodasz później.
            </p>
          )}

          {friends.status === 'ready' && (
            <ParticipantPicker
              friends={friends.items}
              selectedIds={selected}
              onToggle={toggleFriend}
              emptyText={
                <>
                  Nie masz jeszcze znajomych.{' '}
                  <Link to="/friends" className={styles.inlineLink}>
                    Dodaj ich w Znajomych
                  </Link>
                  , a do wyprawy zaprosisz ich później.
                </>
              }
            />
          )}

          {friends.status === 'ready' && friends.items.length > 0 && <p className={panel.hint}>{peopleSummary}</p>}
        </>
      )}
    </TripPanel>
  );
};

export default CreateTripPage;
