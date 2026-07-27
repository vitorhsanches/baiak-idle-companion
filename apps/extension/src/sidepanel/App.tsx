import { useEffect, useState } from 'react';
import type { GameSnapshot } from '@companion/game-adapter';
import { MockGameDataProvider } from '@companion/game-adapter';
import { formatDuration, formatNumber } from '@companion/shared';
import { Breakdown } from '../components/Breakdown';
import { Metric } from '../components/Metric';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { mockSnapshot } from '../features/mockData';
import { defaultSettings, settingsStore, type Settings, type Theme } from '../features/settings';

const pages = ['Overview', 'Hunts', 'Inventory', 'Combat', 'Settings'] as const;
type Page = (typeof pages)[number];
const icons: Record<Page, string> = { Overview: '◈', Hunts: '⌖', Inventory: '▦', Combat: '⚔', Settings: '⚙' };
const provider = new MockGameDataProvider(mockSnapshot);

function Overview({ data }: { data: GameSnapshot }) {
  const { character, hunts } = data;
  return <><header><small>PERSONAGEM</small><h2>{character.name}</h2><p>{character.vocation} · Level {character.level}</p></header>
    <div className="metrics"><Metric label="Talentos" value={`${character.talentPoints} pts`} /><Metric label="Equipamentos" value={`${character.equipment.length}/10`} /></div>
    <section className="card"><h3>Equipamentos & imbuements</h3>{character.equipment.map((item) => <div className="row" key={item.slot}><div><small>{item.slot}</small><strong>{item.name}</strong></div><span>{item.imbuements.join(' · ')}</span></div>)}</section>
    <section className="card accent"><small>HUNT ATUAL · DEMO</small><h3>{hunts[0]?.name ?? 'Nenhuma hunt'}</h3>{hunts[0] && <div className="metrics"><Metric label="XP/h estimada" value={formatNumber(hunts[0].estimatedXpHour)} /><Metric label="Gold/h estimado" value={formatNumber(hunts[0].estimatedGoldHour)} /></div>}</section></>;
}
function Hunts({ data, showCompatibility }: { data: GameSnapshot; showCompatibility: boolean }) {
  if (!data.hunts.length) return <EmptyState message="Nenhuma hunt simulada." />;
  return <><header><small>ANÁLISE LOCAL</small><h2>Hunts recomendadas</h2><p>Estimativas demonstrativas, sem comandos ao jogo.</p></header>{data.hunts.map((hunt) => <section className="card hunt" key={hunt.id}><div><h3>{hunt.name}</h3><small>Level mínimo {hunt.minimumLevel} · Resistência {hunt.relevantResistance}</small></div>{showCompatibility && <strong className="score">{hunt.compatibility}%</strong>}<div className="metrics"><Metric label="XP/h" value={formatNumber(hunt.estimatedXpHour)} /><Metric label="Gold/h" value={formatNumber(hunt.estimatedGoldHour)} /></div></section>)}</>;
}
const labels = { protect: 'Proteger', review: 'Revisar', sellable: 'Vendável', supply: 'Supply' };
function Inventory({ data }: { data: GameSnapshot }) {
  return <><header><small>CLASSIFICAÇÃO SIMULADA</small><h2>Inventário</h2><p>Somente leitura — nenhuma ação de venda disponível.</p></header><section className="card">{data.inventory.map((item) => <div className="row item" key={item.id}><div><strong>{item.name}</strong><small>{item.rarity} · quantidade {item.quantity}</small></div><span className={`tag ${item.classification}`}>{labels[item.classification]}</span></div>)}</section></>;
}
function Combat({ data, showBreakdown }: { data: GameSnapshot; showBreakdown: boolean }) {
  const c = data.combat;
  return <><header><small>SESSÃO SIMULADA</small><h2>Combate</h2><p>Duração {formatDuration(c.durationSeconds)}</p></header><div className="metrics combat"><Metric label="Dano total" value={formatNumber(c.totalDamage)} /><Metric label="DPS" value={formatNumber(c.dps)} /><Metric label="XP/h" value={formatNumber(c.xpHour)} /><Metric label="Gold/h" value={formatNumber(c.goldHour)} /></div>{showBreakdown && <><Breakdown title="Dano por personagem" data={c.byCharacter} /><Breakdown title="Dano por elemento" data={c.byElement} /></>}</>;
}
function SettingsPage({ settings, onChange }: { settings: Settings; onChange: (value: Settings) => void }) {
  const update = (patch: Partial<Settings>) => { const next = { ...settings, ...patch }; onChange(next); void settingsStore.save(next); };
  return <><header><small>PREFERÊNCIAS LOCAIS</small><h2>Settings</h2><p>Dados permanecem somente neste dispositivo.</p></header><section className="card settings">
    <label>Mostrar compatibilidade<input type="checkbox" checked={settings.showCompatibility} onChange={(e) => update({ showCompatibility: e.target.checked })} /></label>
    <label>Detalhes de combate<input type="checkbox" checked={settings.showCombatBreakdown} onChange={(e) => update({ showCombatBreakdown: e.target.checked })} /></label>
    <label>Notificações<input type="checkbox" checked={settings.notifications} onChange={(e) => update({ notifications: e.target.checked })} /></label>
    <label>Tema<select aria-label="Tema" value={settings.theme} onChange={(e) => update({ theme: e.target.value as Theme })}><option value="dark">Escuro</option><option value="light">Claro</option><option value="system">Sistema</option></select></label>
    <button onClick={() => void settingsStore.clearDemoData()}>Limpar dados simulados</button>
    <button className="secondary" onClick={() => { void settingsStore.reset(); onChange(defaultSettings); }}>Restaurar padrões</button>
  </section></>;
}
export function App() {
  const [page, setPage] = useState<Page>('Overview');
  const [data, setData] = useState<GameSnapshot>();
  const [settings, setSettings] = useState(defaultSettings);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([provider.readSnapshot(), settingsStore.load()]).then(([snapshot, stored]) => { setData(snapshot); setSettings(stored); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro desconhecido')); }, []);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme; }, [settings.theme]);
  let content = <LoadingState />;
  if (error) content = <ErrorState message={error} />;
  else if (data) {
    if (page === 'Overview') content = <Overview data={data} />;
    if (page === 'Hunts') content = <Hunts data={data} showCompatibility={settings.showCompatibility} />;
    if (page === 'Inventory') content = <Inventory data={data} />;
    if (page === 'Combat') content = <Combat data={data} showBreakdown={settings.showCombatBreakdown} />;
    if (page === 'Settings') content = <SettingsPage settings={settings} onChange={setSettings} />;
  }
  return <div className="app"><aside><div className="brand"><b>B</b><span>Baiak<br /><strong>Companion</strong></span></div><span className="demo">● Demo mode</span><nav>{pages.map((item) => <button aria-current={page === item ? 'page' : undefined} key={item} onClick={() => setPage(item)}><i>{icons[item]}</i>{item}</button>)}</nav><footer>READ-ONLY · v0.1</footer></aside><main>{content}</main></div>;
}
