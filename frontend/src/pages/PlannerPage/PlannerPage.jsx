import styles from './PlannerPage.module.scss';

const DAY_NAMES = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];

const TRIP_DAYS = 5; //dopiąć serwis liczenia

const MOCK_PINS = {
  0: [
    { id: 'p1', title: 'Wieża Eiffla' },
    { id: 'p2', title: 'Mount Everest' },
  ],
  1: [
    { id: 'p3', title: 'Notre dam' },
  ],
  2: [],
  3: [
    { id: 'p4', title: 'Wieża Eiffla 2' },
  ],
  4: [
    { id: 'p5', title: 'Wersal' },
  ],
};

const PlannerPage = () => {
  const days = DAY_NAMES.slice(0, TRIP_DAYS).map((name, index) => ({
    name,
    index,
    pins: MOCK_PINS[index] || [],
  }));

  return (
    <div className={styles.page}>
      <div className={styles.mapContainer}>
        <div className={styles.mapPlaceholder}>Mapa</div>
      </div>

      <div className={styles.daysRow}>
        {days.map((day) => (
          <div key={day.index} className={styles.dayColumn}>
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{day.name}</span>
              <span className={styles.dayCount}>{day.pins.length}</span>
            </div>

            <div className={styles.pinList}>
              {day.pins.map((pin) => (
                <div key={pin.id} className={styles.pinCard}>
                  {pin.title}
                </div>
              ))}

              {day.pins.length === 0 && (
                <div className={styles.emptyState}>Brak pinezek</div>
              )}
            </div>

            <button type="button" className={styles.addPinBtn}>
              Dodaj pinezkę
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlannerPage;
