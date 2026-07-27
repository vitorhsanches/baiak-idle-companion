export const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="metric"><span>{label}</span><strong>{value}</strong></div>
);
