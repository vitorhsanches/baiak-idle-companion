import type { DamageSlice } from '@companion/domain';
export const Breakdown = ({ title, data }: { title: string; data: DamageSlice[] }) => (
  <section className="card">
    <h3>{title}</h3>
    {data.map((slice) => (
      <div className="breakdown" key={slice.label}>
        <div><span className="dot" style={{ background: slice.color }} />{slice.label}<b>{slice.value}%</b></div>
        <div className="track"><i style={{ width: `${slice.value}%`, background: slice.color }} /></div>
      </div>
    ))}
  </section>
);
