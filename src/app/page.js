import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>DarshaTutor</h1>
      <p className={styles.subtitle}>
        Private tutoring with structured bookings and recurring lessons.
      </p>
    </main>
  );
}
