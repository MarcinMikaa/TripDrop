import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { publicationService } from '../../services/PublicationService';
import { tripPointService } from '../../services/TripPointService';
import { swalError, toastSuccess } from '../../utils/swal';
import { PUBLICATION_TAGS, PUBLICATION_TAG_LABELS, MAX_PUBLICATION_TAGS } from '../../utils/publicationTags';
import { pluralize, PLACE_FORMS, DAY_FORMS } from '../../utils/pluralize';
import pageStyles from './ManageTripPage.module.scss';
import styles from './PublicationTab.module.scss';

const TITLE_MIN = 3;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 1000;
const REGION_MAX = 100;
const MAX_DAYS = 366;

const STEPS = ['Punkty', 'Opis', 'Podgląd'];

const VISIBILITY_OPTIONS = [
  {
    value: 'public',
    icon: 'globe',
    label: 'Publiczna',
    hint: 'Widoczna w zakładce Odkrywaj dla wszystkich, także bez konta.',
  },
  {
    value: 'unlisted',
    icon: 'link',
    label: 'Tylko przez link',
    hint: 'Nie pojawi się na liście. Zobaczy ją każdy, komu wyślesz link.',
  },
];

const dayFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
const dateFormatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

// TODO: ta sama logika co buildBuckets w PlannerPage - scalić przy podziale planera
const buildDays = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < MAX_DAYS) {
    days.push({ index: days.length, label: dayFormatter.format(cursor) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const describeStatus = (publication) => {
  if (publication.status === 'withdrawn') return { label: 'Wycofana', className: styles.badgeMuted };
  if (publication.visibility === 'unlisted') return { label: 'Tylko przez link', className: styles.badgeNeutral };
  return { label: 'Publiczna', className: styles.badgeActive };
};

const PublicationTab = ({ trip, onGoToInfo }) => {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [publication, setPublication] = useState(null);
  const [points, setPoints] = useState([]);

  const [mode, setMode] = useState('view');
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [form, setForm] = useState({
    title: '',
    description: '',
    region: '',
    tags: [],
    visibility: 'public',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([publicationService.getForTrip(trip.id), tripPointService.getByTripId(trip.id)])
      .then(([loadedPublication, loadedPoints]) => {
        if (cancelled) return;
        setPublication(loadedPublication);
        setPoints(loadedPoints);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const days = useMemo(() => buildDays(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);

  const pointsByDay = useMemo(() => {
    const groups = days.map(() => []);
    points.forEach((point) => {
      if (Number.isInteger(point.dayIndex) && point.dayIndex >= 0 && point.dayIndex < groups.length) {
        groups[point.dayIndex].push(point);
      }
    });
    groups.forEach((group) => group.sort((a, b) => a.position - b.position));
    return groups;
  }, [points, days]);

  const publishableIds = useMemo(() => new Set(pointsByDay.flat().map((point) => point.id)), [pointsByDay]);

  const previousIds = useMemo(() => new Set(publication?.pointIds ?? []), [publication]);

  const hasDates = days.length > 0;
  const canPublish = hasDates && publishableIds.size > 0;
  const skippedCount = points.length - publishableIds.size;

  const selectedPublishable = [...selectedIds].filter((id) => publishableIds.has(id));
  const titleLength = form.title.trim().length;
  const isTitleValid = titleLength >= TITLE_MIN && titleLength <= TITLE_MAX;

  const canProceed =
    step === 0
      ? selectedPublishable.length > 0
      : step === 1
        ? isTitleValid
        : selectedPublishable.length > 0 && isTitleValid;

  const blockedReason =
    step === 0 && selectedPublishable.length === 0
      ? 'Zaznacz przynajmniej jeden punkt.'
      : step === 1 && !isTitleValid
        ? `Tytuł musi mieć od ${TITLE_MIN} do ${TITLE_MAX} znaków.`
        : null;

  const startWizard = () => {
    const initial = publication ? [...publishableIds].filter((id) => previousIds.has(id)) : [...publishableIds];

    setSelectedIds(new Set(initial));
    setForm({
      title: (publication?.title ?? trip.name ?? '').slice(0, TITLE_MAX),
      description: (publication?.description ?? trip.description ?? '').slice(0, DESCRIPTION_MAX),
      region: publication?.region ?? '',
      tags: publication?.tags ?? [],
      visibility: publication?.visibility ?? 'public',
    });
    setStep(0);
    setMode('wizard');
  };

  const togglePoint = (pointId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pointId)) next.delete(pointId);
      else next.add(pointId);
      return next;
    });
  };

  const toggleDay = (dayPoints) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = dayPoints.every((point) => next.has(point.id));
      dayPoints.forEach((point) => (allSelected ? next.delete(point.id) : next.add(point.id)));
      return next;
    });
  };

  const toggleTag = (key) => {
    setForm((prev) => {
      if (prev.tags.includes(key)) return { ...prev, tags: prev.tags.filter((tag) => tag !== key) };
      if (prev.tags.length >= MAX_PUBLICATION_TAGS) return prev;
      return { ...prev, tags: [...prev.tags, key] };
    });
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePublish = async () => {
    const wasPublished = publication !== null;
    setIsSaving(true);
    try {
      const saved = await publicationService.publish(trip.id, {
        pointIds: selectedPublishable,
        title: form.title.trim(),
        description: form.description.trim() || null,
        region: form.region.trim() || null,
        tags: form.tags,
        visibility: form.visibility,
      });
      setPublication(saved);
      setMode('view');
      toastSuccess(wasPublished ? 'Publikacja zaktualizowana.' : 'Wycieczka opublikowana!');
    } catch (err) {
      swalError('Nie udało się opublikować', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/explore/${publication.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('Skopiowano link.');
    } catch {
      swalError('Nie udało się skopiować', url);
    }
  };

  if (status === 'loading') {
    return <p className={styles.muted}>Ładowanie…</p>;
  }

  if (status === 'error') {
    return (
      <div className={styles.notice}>
        <p>Nie udało się wczytać publikacji: {loadError}</p>
      </div>
    );
  }

  const blocker = !hasDates ? (
    <div className={styles.notice}>
      <p>Publikacja dzieli plan na dni, więc wycieczka musi mieć ustawione daty.</p>
      <button type="button" className={styles.secondaryBtn} onClick={onGoToInfo}>
        Ustaw daty
      </button>
    </div>
  ) : publishableIds.size === 0 ? (
    <div className={styles.notice}>
      <p>Żaden punkt nie jest przypisany do dnia. Rozplanuj trasę w planerze i wróć tutaj.</p>
      <button type="button" className={styles.secondaryBtn} onClick={() => navigate(`/planner/${trip.id}`)}>
        Otwórz planer
      </button>
    </div>
  ) : null;

  // ---- Widok stanu ----

  if (mode === 'view' && !publication) {
    return (
      <>
        <p className={pageStyles.contentTitle}>Udostępnianie</p>
        <div className={styles.intro}>
          <p>
            Opublikowana trasa pojawi się w zakładce Odkrywaj. Inni zobaczą miejsca i podział na dni, ale nie daty,
            listę uczestników ani to, kto dodał który punkt.
          </p>
          <p>Publikacja to migawka: późniejsze zmiany w wycieczce nie trafią do niej, dopóki jej nie zaktualizujesz.</p>
        </div>
        {blocker ?? (
          <button type="button" className={pageStyles.saveBtn} onClick={startWizard}>
            Przygotuj publikację
          </button>
        )}
      </>
    );
  }

  if (mode === 'view') {
    const badge = describeStatus(publication);
    return (
      <>
        <p className={pageStyles.contentTitle}>Udostępnianie</p>
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
            <span className={styles.muted}>Skopiowano: {publication.copyCount}</span>
          </div>
          <h3 className={styles.statusTitle}>{publication.title}</h3>
          <p className={styles.muted}>
            {pluralize(publication.dayCount, DAY_FORMS)} - {pluralize(publication.pointCount, PLACE_FORMS)}
            {publication.region ? ` - ${publication.region}` : ''}
          </p>
          <p className={styles.muted}>
            Opublikowano {dateFormatter.format(new Date(publication.publishedAt))}
            {publication.updatedAt ? `, zaktualizowano ${dateFormatter.format(new Date(publication.updatedAt))}` : ''}
          </p>
          <div className={styles.actions}>
            <button type="button" className={pageStyles.saveBtn} onClick={startWizard} disabled={!canPublish}>
              Zaktualizuj publikację
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={handleCopyLink}>
              Kopiuj link
            </button>
          </div>
        </div>
        {blocker}
      </>
    );
  }

  // ---- Kreator ----

  return (
    <>
      <p className={pageStyles.contentTitle}>{publication ? 'Aktualizacja publikacji' : 'Nowa publikacja'}</p>

      <ol className={styles.stepper}>
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`${styles.stepItem} ${i === step ? styles.stepCurrent : ''} ${i < step ? styles.stepDone : ''}`}>
            <button type="button" disabled={i >= step || isSaving} onClick={() => setStep(i)}>
              <span className={styles.stepNumber}>{i + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <p className={styles.hint}>
            Odznacz miejsca, których nie chcesz pokazywać, np. adres domu albo noclegu u znajomych.
            {publication && ' Punkty dodane od ostatniej publikacji są domyślnie odznaczone.'}
          </p>

          <div className={styles.days}>
            {days.map((day) => {
              const dayPoints = pointsByDay[day.index];
              const selectedInDay = dayPoints.filter((point) => selectedIds.has(point.id)).length;
              const allSelected = dayPoints.length > 0 && selectedInDay === dayPoints.length;

              return (
                <div key={day.index} className={styles.dayGroup}>
                  <label className={styles.dayHeader}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={dayPoints.length === 0}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedInDay > 0 && !allSelected;
                      }}
                      onChange={() => toggleDay(dayPoints)}
                    />
                    <span className={styles.dayNumber}>Dzień {day.index + 1}</span>
                    <span className={styles.dayLabel}>{day.label}</span>
                    <span className={styles.dayCount}>
                      {selectedInDay}/{dayPoints.length}
                    </span>
                  </label>

                  {dayPoints.length === 0 ? (
                    <p className={styles.dayEmpty}>Bez punktów</p>
                  ) : (
                    dayPoints.map((point, i) => (
                      <label key={point.id} className={styles.pointRow}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(point.id)}
                          onChange={() => togglePoint(point.id)}
                        />
                        <span className={styles.pointOrder}>{i + 1}</span>
                        <span className={styles.pointName}>{point.name?.trim() || <em>Bez nazwy</em>}</span>
                        {publication && !previousIds.has(point.id) && <span className={styles.newTag}>nowy</span>}
                      </label>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {skippedCount > 0 && (
            <p className={styles.muted}>Punkty z „Nieprzypisanych” nie są publikowane (pominięte: {skippedCount}).</p>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <div className={pageStyles.field}>
            <label htmlFor="publication-title">
              Tytuł{' '}
              <span className={styles.counter}>
                {form.title.length}/{TITLE_MAX}
              </span>
            </label>
            <input
              id="publication-title"
              name="title"
              value={form.title}
              maxLength={TITLE_MAX}
              onChange={handleFieldChange}
            />
          </div>

          <div className={pageStyles.field}>
            <label htmlFor="publication-description">
              Opis{' '}
              <span className={styles.counter}>
                {form.description.length}/{DESCRIPTION_MAX}
              </span>
            </label>
            <textarea
              id="publication-description"
              name="description"
              rows={4}
              value={form.description}
              maxLength={DESCRIPTION_MAX}
              onChange={handleFieldChange}
            />
          </div>

          <div className={pageStyles.field}>
            <label htmlFor="publication-region">Region</label>
            <input
              id="publication-region"
              name="region"
              placeholder="np. Kraków, Bieszczady"
              value={form.region}
              maxLength={REGION_MAX}
              onChange={handleFieldChange}
            />
          </div>

          <div className={pageStyles.field}>
            <label>
              Tagi{' '}
              <span className={styles.counter}>
                {form.tags.length}/{MAX_PUBLICATION_TAGS}
              </span>
            </label>
            <div className={styles.tags} role="group" aria-label="Tagi">
              {PUBLICATION_TAGS.map((tag) => {
                const selected = form.tags.includes(tag.key);
                const blocked = !selected && form.tags.length >= MAX_PUBLICATION_TAGS;
                return (
                  <button
                    key={tag.key}
                    type="button"
                    aria-pressed={selected}
                    disabled={blocked}
                    className={`${styles.tag} ${selected ? styles.tagSelected : ''}`}
                    onClick={() => toggleTag(tag.key)}>
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={pageStyles.field}>
            <label>Widoczność</label>
            <div className={styles.visibility} role="radiogroup" aria-label="Widoczność">
              {VISIBILITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`${styles.visibilityOption} ${form.visibility === option.value ? styles.visibilitySelected : ''}`}>
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={form.visibility === option.value}
                    onChange={handleFieldChange}
                  />
                  <FontAwesomeIcon icon={option.icon} />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <div className={styles.preview}>
          <h3 className={styles.statusTitle}>{form.title.trim()}</h3>
          <p className={styles.muted}>
            {pluralize(days.length, DAY_FORMS)} - {pluralize(selectedPublishable.length, PLACE_FORMS)}
            {form.region.trim() ? ` - ${form.region.trim()}` : ''}
          </p>

          {form.tags.length > 0 && (
            <div className={styles.tags}>
              {form.tags.map((key) => (
                <span key={key} className={`${styles.tag} ${styles.tagStatic}`}>
                  {PUBLICATION_TAG_LABELS[key] ?? key}
                </span>
              ))}
            </div>
          )}

          {form.description.trim() && <p className={styles.previewDescription}>{form.description.trim()}</p>}

          <div className={styles.previewDays}>
            {days.map((day) => {
              const chosen = pointsByDay[day.index].filter((point) => selectedIds.has(point.id));
              return (
                <div key={day.index}>
                  <strong>Dzień {day.index + 1}</strong>
                  <span className={styles.muted}>
                    {chosen.length === 0
                      ? ' — bez punktów'
                      : ` — ${chosen.map((point) => point.name?.trim() || 'Bez nazwy').join(', ')}`}
                  </span>
                </div>
              );
            })}
          </div>

          <p className={styles.muted}>{VISIBILITY_OPTIONS.find((option) => option.value === form.visibility)?.hint}</p>
        </div>
      )}

      <div className={styles.wizardFooter}>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={isSaving}
          onClick={() => (step === 0 ? setMode('view') : setStep(step - 1))}>
          {step === 0 ? 'Anuluj' : 'Wstecz'}
        </button>

        <span className={styles.footerHint}>{blockedReason}</span>

        {step < STEPS.length - 1 ? (
          <button type="button" className={pageStyles.saveBtn} disabled={!canProceed} onClick={() => setStep(step + 1)}>
            Dalej
          </button>
        ) : (
          <button
            type="button"
            className={pageStyles.saveBtn}
            disabled={!canProceed || isSaving}
            onClick={handlePublish}>
            {isSaving ? 'Publikowanie…' : publication ? 'Zaktualizuj publikację' : 'Opublikuj'}
          </button>
        )}
      </div>
    </>
  );
};

export default PublicationTab;
