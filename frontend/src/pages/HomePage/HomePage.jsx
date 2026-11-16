import { NavLink } from 'react-router-dom';
import styles from './HomePage.module.scss';
//import TypewriterText from '../utils/typewriter';

const HERO_CONTOURS = [
  'M300 150c0-50 40-90 90-88s85 38 82 86-42 80-92 78-80-26-80-76z',
  'M270 152c0-70 55-118 122-116s114 52 110 116-58 108-124 106-108-36-108-106z',
  'M238 156c2-92 72-150 156-146s144 68 138 148-76 136-158 132-138-46-136-134z',
  'M206 160c4-114 90-184 190-178s176 84 168 182-94 168-194 162-168-58-164-166z',
  'M70 330c0-40 30-66 66-64s62 30 60 64-32 58-66 56-60-20-60-56z',
  'M40 332c2-58 46-96 98-94s92 44 88 96-48 86-98 84-90-30-88-86z',
  'M10 336c4-76 62-126 130-124s120 58 114 126-62 112-128 110-118-38-116-112z',
];

const HERO_ROADS = [
  'M-10 250 C90 260 160 200 250 230 S420 300 580 260',
  'M180 -10 C200 90 160 180 210 260 S260 420 240 530',
];

const HERO_ROUTES = [
  { day: 1, d: 'M70 420 C110 390 140 360 170 330 S240 260 300 250', delay: '0s' },
  { day: 2, d: 'M300 250 C340 230 360 200 380 160 S420 100 470 92', delay: '-0.5s' },
  { day: 3, d: 'M470 92 C510 130 516 190 494 236 S446 330 420 392', delay: '-1s' },
];

const HERO_PINS = [
  { day: 1, x: 70, y: 420, label: 1 },
  { day: 1, x: 170, y: 330, label: 2 },
  { day: 1, x: 300, y: 250, label: 3 },
  { day: 2, x: 380, y: 160, label: 1 },
  { day: 2, x: 470, y: 92, label: 2 },
  { day: 3, x: 494, y: 236, label: 1 },
  { day: 3, x: 420, y: 392, label: 2 },
];

const CARD_CONTOURS = [
  'M200 60c30-30 90-26 110 6s-6 70-50 76-84-14-80-44 0-24 20-38z',
  'M176 52c40-44 126-40 150 10s-10 98-72 104-116-20-112-62 4-32 34-52z',
  'M150 46c50-58 160-54 192 12s-14 126-94 132-150-26-146-80 8-40 48-64z',
  'M100 170c20-30 70-34 90-10s0 50-40 52-64-14-50-42z',
];

const LOCK_CONTOURS = [
  'M1040 300c0-120 100-210 220-206s210 96 202 214-104 196-226 190-196-68-196-198z',
  'M990 304c2-150 126-262 274-256s262 120 252 268-130 244-282 238-246-86-244-250z',
  'M940 310c4-180 152-314 328-306s314 144 302 322-156 292-338 286-296-104-292-302z',
  'M890 316c6-210 178-366 382-356s366 168 352 376-182 340-394 332-346-122-340-352z',
  'M-60 560c40-110 160-170 280-150s190 120 150 220',
  'M-90 600c50-150 210-230 360-200s240 160 190 290',
];

const STEPS = [
  {
    title: 'Załóż wyprawę',
    text: 'Nazwa i daty. Dni pojawiają się w planerze same, gotowe do wypełnienia.',
  },
  {
    title: 'Zaproś znajomych',
    text: 'Dodaj uczestników ze swojej listy znajomych. Wszyscy pracują na tej samej mapie.',
  },
  {
    title: 'Planujcie na żywo',
    text: 'Kursory, obecność i każda zmiana punktu widoczne od razu u wszystkich.',
  },
  {
    title: 'Zamknij i ruszaj',
    text: 'Zakończ planowanie, a trasę dnia otwórz w Google Maps albo pobierz jako GPX.',
  },
];

const EXAMPLE_TRIPS = [
  {
    title: 'Beskid Śląski: Szczyrk i Skrzyczne',
    days: '2 dni',
    meta: '9 miejsc · @ola · skopiowano 34 razy',
    votes: 128,
    highlighted: true,
    tags: ['góry', 'weekend'],
    points: [
      { x: 90, y: 150, day: 1 },
      { x: 150, y: 118, day: 1 },
      { x: 214, y: 92, day: 1 },
      { x: 250, y: 70, day: 2 },
      { x: 296, y: 96, day: 2 },
      { x: 310, y: 142, day: 2 },
    ],
  },
  {
    title: 'Kraków w 48 godzin',
    days: '2 dni',
    meta: '12 miejsc · @kuba · skopiowano 21 razy',
    votes: 96,
    highlighted: false,
    tags: ['miasto', 'jedzenie'],
    points: [
      { x: 120, y: 80, day: 1 },
      { x: 160, y: 104, day: 1 },
      { x: 190, y: 78, day: 1 },
      { x: 222, y: 120, day: 2 },
      { x: 260, y: 98, day: 2 },
      { x: 286, y: 136, day: 2 },
      { x: 200, y: 150, day: 2 },
    ],
  },
  {
    title: 'Tatry od Kuźnic',
    days: '3 dni',
    meta: '11 miejsc · @marcin · skopiowano 17 razy',
    votes: 74,
    highlighted: false,
    tags: ['góry', 'szlaki', 'majówka'],
    points: [
      { x: 70, y: 160, day: 1 },
      { x: 120, y: 130, day: 1 },
      { x: 180, y: 110, day: 2 },
      { x: 236, y: 64, day: 2 },
      { x: 280, y: 52, day: 3 },
      { x: 320, y: 90, day: 3 },
    ],
  },
];

const EXPORTS = [
  {
    icon: 'fa-map-location-dot',
    title: 'Google Maps',
    text: 'Trasa dnia albo cała wyprawa, dzielona na odcinki',
  },
  {
    icon: 'fa-layer-group',
    title: 'KML do Moich map',
    text: 'Każdy dzień jako osobna warstwa w swoim kolorze',
  },
  {
    icon: 'fa-route',
    title: 'GPX',
    text: 'Do aplikacji nawigacyjnych i zegarków',
  },
  {
    icon: 'fa-qrcode',
    title: 'Kod QR',
    text: 'Zeskanuj z ekranu i jedź z telefonem',
  },
];

const dayClass = (day) => styles[`day${day}`];

export default function HomePage() {
  return (
    <div className={styles.page}>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Planujcie wyjazd w jednym momencie, na wspólnej mapie.</h1>
            <p className={styles.heroSubtitle}>
              Twórzcie wyprawy, przeciągajcie punkty między dniami i widźcie się nawzajem na mapie
              na żywo. Gdy plan jest gotowy, zamknijcie go i wyruszajcie na niesamowitą przygodę.
            </p>
            <div className={styles.heroActions}>
              <NavLink to="/register" className={styles.btnPrimary}>
                Załóż konto
                <i className="fas fa-arrow-right" aria-hidden="true" />
              </NavLink>
              <NavLink to="/explore" className={styles.btnOutline}>
                Przeglądaj tras
              </NavLink>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroMap} aria-hidden="true">
              <svg
                className={styles.mapArt}
                viewBox="0 0 560 520"
                preserveAspectRatio="xMidYMid slice"
              >
                <path
                  className={styles.mapRiver}
                  d="M-10 470 C80 430 120 470 200 440 S300 360 360 380 S470 470 580 430"
                />
                {HERO_CONTOURS.map((d) => (
                  <path key={d} className={styles.mapContour} d={d} />
                ))}
                {HERO_ROADS.map((d) => (
                  <path key={d} className={styles.mapRoad} d={d} />
                ))}
                {HERO_ROUTES.map((route) => (
                  <path
                    key={route.d}
                    className={`${styles.mapRoute} ${dayClass(route.day)}`}
                    style={{ animationDelay: route.delay }}
                    d={route.d}
                  />
                ))}
                {HERO_PINS.map((pin) => (
                  <g key={`${pin.x}-${pin.y}`}>
                    <circle
                      className={`${styles.mapPin} ${dayClass(pin.day)}`}
                      cx={pin.x}
                      cy={pin.y}
                      r="14"
                    />
                    <text className={styles.mapPinLabel} x={pin.x} y={pin.y}>
                      {pin.label}
                    </text>
                  </g>
                ))}
              </svg>

              <div className={styles.mapCard}>
                <i className="fas fa-calendar-days" aria-hidden="true" />
                <div className={styles.mapCardText}>
                  <span className={styles.mapCardTitle}>Majówka 2027</span>
                  <span className={styles.mapCardMeta}>1–3 maja · 7 miejsc</span>
                </div>
              </div>

              <div className={`${styles.mapCursor} ${styles.mapCursorFirst}`}>
                <i className={`fas fa-location-arrow ${dayClass(1)}`} aria-hidden="true" />
                <span className={`${styles.mapCursorName} ${dayClass(1)}`}>Ola</span>
              </div>
              <div className={`${styles.mapCursor} ${styles.mapCursorSecond}`}>
                <i className={`fas fa-location-arrow ${dayClass(2)}`} aria-hidden="true" />
                <span className={`${styles.mapCursorName} ${dayClass(2)}`}>Kuba</span>
              </div>

              <div className={styles.mapFooter}>
                <div className={styles.mapDays}>
                  {[1, 2, 3].map((day) => (
                    <span key={day} className={styles.mapDay}>
                      <span className={`${styles.mapDayDot} ${dayClass(day)}`} />
                      Dzień {day}
                    </span>
                  ))}
                </div>
                <span className={styles.mapStatus}>
                  <span className={styles.mapStatusDot} />
                  Kuba edytuje Dzień 2
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.steps} aria-labelledby="how-title">
        <div className={styles.sectionInner}>
          <h2 id="how-title" className={styles.sectionTitle}>Jak wygląda wspólne planowanie</h2>
          <ol className={styles.stepList}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <div className={styles.stepHead}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <span className={styles.stepLine} />
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.trips} aria-labelledby="explore-title">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <h2 id="explore-title" className={styles.sectionTitle}>Trasy, które ktoś już sprawdził</h2>
            <NavLink to="/explore" className={styles.sectionLink}>
              Zobacz wszystkie
              <i className="fas fa-arrow-right" aria-hidden="true" />
            </NavLink>
          </div>
          <div className={styles.tripGrid}>
            {EXAMPLE_TRIPS.map((trip) => (
              <article key={trip.title} className={styles.tripCard}>
                <div className={styles.tripMap}>
                  <svg
                    className={styles.mapArt}
                    viewBox="0 0 360 200"
                    preserveAspectRatio="xMidYMid slice"
                    aria-hidden="true"
                  >
                    <path
                      className={`${styles.mapRiver} ${styles.mapRiverThin}`}
                      d="M40 -10 C60 40 30 80 70 120 S90 180 80 210"
                    />
                    {CARD_CONTOURS.map((d) => (
                      <path key={d} className={styles.mapContour} d={d} />
                    ))}
                    <path
                      className={`${styles.mapRoad} ${styles.mapRoadThin}`}
                      d="M-10 140 C80 120 140 160 220 130 S330 90 370 100"
                    />
                    {trip.points.map((point) => (
                      <circle
                        key={`${point.x}-${point.y}`}
                        className={`${styles.mapDot} ${dayClass(point.day)}`}
                        cx={point.x}
                        cy={point.y}
                        r="6.5"
                      />
                    ))}
                  </svg>
                  <span className={styles.tripDays}>{trip.days}</span>
                </div>
                <div className={styles.tripBody}>
                  <div className={styles.tripHead}>
                    <h3 className={styles.tripTitle}>{trip.title}</h3>
                    <span
                      className={`${styles.tripVotes} ${trip.highlighted ? styles.tripVotesActive : ''}`}
                    >
                      <i className="fas fa-fire" aria-hidden="true" />
                      {trip.votes}
                    </span>
                  </div>
                  <p className={styles.tripMeta}>{trip.meta}</p>
                  <div className={styles.tripTags}>
                    {trip.tags.map((tag) => (
                      <span key={tag} className={styles.tripTag}>#{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.lock} aria-labelledby="lock-title">
        <svg
          className={styles.lockArt}
          viewBox="0 0 1440 640"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {LOCK_CONTOURS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <div className={styles.lockInner}>
          <div className={styles.lockContent}>
            <h2 id="lock-title" className={styles.lockTitle}>
              Zamknięty plan nie zmieni się przed wyjazdem
            </h2>
            <p className={styles.lockText}>
              Właściciel jednym kliknięciem kończy planowanie. Punkty i daty stają się tylko do
              odczytu dla wszystkich uczestników, a eksport jest pod ręką. Wznowić można w każdej
              chwili.
            </p>
            <div className={styles.lockCard}>
              <span className={styles.lockIcon}>
                <i className="fas fa-lock" aria-hidden="true" />
              </span>
              <div className={styles.lockCardText}>
                <span className={styles.lockCardTitle}>Plan zamknięty przez Marcina</span>
                <span className={styles.lockCardMeta}>2 lis 2026, 18:40 · tylko do odczytu</span>
              </div>
            </div>
          </div>
          <ul className={styles.exportList}>
            {EXPORTS.map((item) => (
              <li key={item.title} className={styles.exportItem}>
                <span className={styles.exportIcon}>
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                </span>
                <div className={styles.exportText}>
                  <span className={styles.exportTitle}>{item.title}</span>
                  <span className={styles.exportMeta}>{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={styles.ctaInner}>
          <h2 id="cta-title" className={styles.ctaTitle}>Zacznijcie od pierwszej wyprawy</h2>
          <NavLink to="/register" className={styles.btnPrimary}>
            Załóż konto
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </NavLink>
        </div>
      </section>

    </div>
  );
}
