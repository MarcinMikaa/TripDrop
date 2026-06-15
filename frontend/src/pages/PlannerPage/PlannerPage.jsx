import { useState } from 'react';
import styles from './PlannerPage.module.scss';

export default function PlannerPage() {
  return (
  <div className={styles.container}>
      <h1>Planer</h1>
      <div className={styles.days}></div>
  </div>
  );  
}
