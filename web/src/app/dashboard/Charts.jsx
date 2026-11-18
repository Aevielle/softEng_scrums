'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './dashboard.module.css';

const CW = 340;
const CH = 200;

// Adds the `go` class when the chart scrolls into view, which starts the draw/grow animation
function useInView() {
  const ref = useRef(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setGo(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setGo(true);
          else if (e.boundingClientRect.top > 0) setGo(false); // replay when scrolled back to
        }),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, go];
}

/** data: [[label, value], ...] */
export function SalesChart({ data }) {
  const [ref, go] = useInView();
  if (!data.length) return <p className={styles.muted}>No sales yet.</p>;

  const max = Math.max(...data.map((d) => d[1])) * 1.15 || 1;
  const x = (i) => (data.length > 1 ? 30 + (i * (CW - 60)) / (data.length - 1) : CW / 2);
  const y = (v) => CH - 28 - (v / max) * (CH - 50);

  let d = `M${x(0)} ${y(data[0][1])}`;
  for (let i = 1; i < data.length; i++) {
    const a = x(i - 1);
    const b = x(i);
    d += `C${(a + b) / 2} ${y(data[i - 1][1])},${(a + b) / 2} ${y(data[i][1])},${b} ${y(data[i][1])}`;
  }

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${CW} ${CH}`}
      className={`${styles.chart} ${go ? styles.go : ''}`}
      role="img"
      aria-label="Sales overview"
    >
      <defs>
        <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3c64e6" stopOpacity=".55" />
          <stop offset="1" stopColor="#3c64e6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="0"
          x2={CW}
          y1={20 + (i * (CH - 60)) / 3}
          y2={20 + (i * (CH - 60)) / 3}
          stroke="var(--line)"
          strokeDasharray="4 5"
        />
      ))}
      <path className={styles.area} d={`${d}L${x(data.length - 1)} ${CH - 28}L${x(0)} ${CH - 28}Z`} fill="url(#ga)" />
      <path className={styles.line} d={d} fill="none" stroke="#5b82ff" strokeWidth="3" strokeLinecap="round" />
      {data.map((p, i) => (
        <g key={p[0]}>
          <circle className={styles.dot} cx={x(i)} cy={y(p[1])} r="4" fill="var(--card)" stroke="#5b82ff" strokeWidth="2" />
          <text className={styles.lbl} x={x(i)} y={CH - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {p[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** data: [[label, value], ...] already sorted high to low */
export function ProductChart({ data }) {
  const [ref, go] = useInView();
  if (!data.length) return <p className={styles.muted}>No data yet.</p>;

  const max = Math.max(...data.map((d) => d[1])) || 1;
  const w = (CW - 40) / data.length;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${CW} ${CH}`}
      className={`${styles.chart} ${go ? styles.go : ''}`}
      role="img"
      aria-label="Revenue by product"
    >
      <defs>
        <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fb0ff" />
          <stop offset="1" stopColor="#1A43BF" />
        </linearGradient>
      </defs>
      {data.map((p, i) => {
        const h = Math.max(12, (p[1] / max) * (CH - 50));
        return (
          <g key={p[0]}>
            <rect
              className={styles.bar}
              x={20 + i * w + w * 0.14}
              y={CH - 28 - h}
              width={w * 0.72}
              height={h}
              rx="12"
              fill="url(#gb)"
              style={{ animationDelay: `${i * 70}ms` }}
            />
            <text className={styles.lbl} x={20 + i * w + w / 2} y={CH - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
              {p[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}