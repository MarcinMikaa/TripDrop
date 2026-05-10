import styles from './HomePage.module.scss';

export default function HomePage() {
  return (
    <div className={styles.page}>

      {/* {section1} */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Uprość swoją podróż</h1>
          <p className={styles.heroSubtitle}>
            Tripdrop sprawi, że planowanie każdego twojego<br />
            wypadu ze znajomymi zajmie krótką chwilę.
          </p>
          <div className={styles.heroActions}>

            <button className={styles.btnSun}>
              Utwórz pokój
              <span className={styles.sunRays} aria-hidden="true">
                <span /><span /><span /><span />
                <span /><span /><span /><span />
              </span>
            </button>

            <button className={styles.btnOutline}>Dodaj znajomych</button>
          </div>
        </div>
      </section>

      {/* section 2 */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>

          <div className={styles.ctaTitle}>Jesteś nowy?</div>

          <div className={styles.ctaRow}>
            <button className={styles.btnRegister}>Zarejestruj się</button>
            <p className={styles.ctaText}>By wygodnie planować swoją podróż</p>
          </div>

          <div className={styles.ctaRowBottom}>
            <p className={styles.ctaTextBottom}>Aby finalizować swoje wakacje.</p>
            <button className={styles.btnRegister}>Zaloguj się</button>
          </div>

        </div>
      </section>

    </div>
  );
}
