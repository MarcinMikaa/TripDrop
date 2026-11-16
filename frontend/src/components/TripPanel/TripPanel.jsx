import { Link } from 'react-router-dom';
import styles from './TripPanel.module.scss';

const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className={styles.icon}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const CheckMark = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" className={styles.iconBold}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const TabMarker = ({ tab }) => {
  if (tab.done) {
    return (
      <span className={`${styles.marker} ${styles.markerDone}`}>
        <CheckMark />
      </span>
    );
  }
  if (tab.step) return <span className={styles.marker}>{tab.step}</span>;
  return null;
};

const TripPanel = ({
  backTo = '/trips',
  backLabel = 'Wycieczki',
  eyebrow,
  title,
  meta,
  actions,
  tabs = [],
  activeTab,
  onTabChange,
  tabsLabel,
  currentType = 'page',
  aside,
  asideLabel = 'Podgląd wyprawy',
  alert,
  footerNote,
  footerActions,
  children,
}) => {
  const hasFooter = Boolean(alert || footerNote || footerActions);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link to={backTo} className={styles.back}>
          <ArrowLeft />
          {backLabel}
        </Link>

        <section className={styles.card} aria-labelledby="trip-panel-title">
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.heading}>
                {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
                <h1 id="trip-panel-title" className={styles.title}>
                  {title}
                </h1>
                {meta && <div className={styles.meta}>{meta}</div>}
              </div>
              {actions && <div className={styles.headerActions}>{actions}</div>}
            </div>

            {tabs.length > 0 && (
              <nav className={styles.tabs} aria-label={tabsLabel}>
                {tabs.map((tab) => {
                  const active = tab.key === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                      aria-current={active ? currentType : undefined}
                      disabled={tab.disabled}
                      onClick={() => onTabChange?.(tab.key)}>
                      <TabMarker tab={tab} />
                      {tab.label}
                      {tab.badge ? <span className={styles.tabBadge}>{tab.badge}</span> : null}
                    </button>
                  );
                })}
              </nav>
            )}
          </header>

          <div className={styles.body}>
            <div className={styles.content}>{children}</div>
            {aside && (
              <aside className={styles.aside} aria-label={asideLabel}>
                {aside}
              </aside>
            )}
          </div>

          {hasFooter && (
            <footer className={styles.footer}>
              {alert && (
                <p className={styles.alert} role="alert">
                  {alert}
                </p>
              )}
              <span className={styles.footerNote} aria-live="polite">
                {footerNote}
              </span>
              {footerActions && <div className={styles.footerActions}>{footerActions}</div>}
            </footer>
          )}
        </section>
      </main>
    </div>
  );
};

export default TripPanel;
