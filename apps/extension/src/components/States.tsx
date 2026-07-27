export const LoadingState = () => <div className="state"><span className="spinner" />Carregando dados locais…</div>;
export const EmptyState = ({ message }: { message: string }) => <div className="state">◇ {message}</div>;
export const ErrorState = ({ message }: { message: string }) => <div className="state error">Não foi possível carregar: {message}</div>;
