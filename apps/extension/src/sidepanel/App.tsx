import { useEffect, useState, type ChangeEvent } from 'react';
import type { GameSnapshot } from '@companion/game-adapter';
import { MockGameDataProvider } from '@companion/game-adapter';
import { formatDuration, formatNumber } from '@companion/shared';
import { Breakdown } from '../components/Breakdown';
import { Metric } from '../components/Metric';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { mockSnapshot } from '../features/mockData';
import { defaultSettings, settingsStore, type Settings, type Theme } from '../features/settings';
import { parseLocalCatalog } from '../features/catalogs';
import { classifyItem, defaultProfile, localDataStore, type LocalData } from '../features/localData';
import { recommendHunts } from '@companion/optimizer-core';
import { createMessage, defaultLiveState, isLiveMessage, type LiveIntegrationState } from '../integration/protocol';

const pages = ['Overview', 'Hunts', 'Inventory', 'Combat', 'Settings'] as const;
type Page = (typeof pages)[number];
const icons: Record<Page, string> = { Overview: '◈', Hunts: '⌖', Inventory: '▦', Combat: '⚔', Settings: '⚙' };
const provider = new MockGameDataProvider(mockSnapshot);

function LiveDomPanel({ live, settings, onSettings, onLive }: { live: LiveIntegrationState; settings: Settings; onSettings: (value: Settings) => void; onLive: (value: LiveIntegrationState) => void }) {
  const toggle = async (enabled: boolean) => {
    if (enabled && !window.confirm('Habilitar leitura local e somente leitura de nome, vocação, level, hunt, equipamentos, imbuements, talentos e inventário apenas quando visível? Cookies, tokens, storage do jogo, rede, chat e ações nunca são acessados.')) return;
    const next = { ...settings, liveDomEnabled: enabled };
    const state = await chrome.runtime.sendMessage(createMessage('integration-set', 'side-panel', { enabled })) as LiveIntegrationState | undefined;
    onSettings(next);
    await settingsStore.save(next);
    if (state) onLive(state);
  };
  const clear = async () => {
    if (!window.confirm('Apagar snapshots reais e diagnóstico local?')) return;
    const state = await chrome.runtime.sendMessage(createMessage('data-clear-request', 'side-panel', {})) as LiveIntegrationState | undefined;
    if (state) onLive(state);
  };
  const exportDiagnostics = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), selectorVersion: live.lastSnapshot?.selectorVersion, diagnostics: live.diagnostics }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'baiak-idle-selector-diagnostics.json'; link.click(); URL.revokeObjectURL(link.href);
  };
  return <section className="card">
    <small>LIVE DOM READ-ONLY</small><h3>Integração: {live.status}</h3>
    <label>Enable live read-only game data<input aria-label="Enable live read-only game data" type="checkbox" checked={settings.liveDomEnabled} onChange={(event) => void toggle(event.target.checked)} /></label>
    <p>Lê somente dados visíveis em https://baiakidle.com/jogar/. Nunca acessa cookies, tokens, storage do jogo, rede, chat ou executa ações.</p>
    {live.lastSnapshot && <div><strong>{live.lastSnapshot.character.name ?? 'Nome indisponível'} · Level {live.lastSnapshot.character.level ?? 'indisponível'}</strong><p>Origem: Live DOM · confiança {live.lastSnapshot.confidence} · seletores v{live.lastSnapshot.selectorVersion} · {new Date(live.lastSnapshot.timestamp).toLocaleString()}</p>{live.lastSnapshot.missingFields.length > 0 && <p>Campos indisponíveis: {live.lastSnapshot.missingFields.join(', ')}</p>}</div>}
    <button onClick={() => void chrome.runtime.sendMessage(createMessage('snapshot-refresh-request', 'side-panel', {}))}>Atualizar leitura</button>
    <button onClick={exportDiagnostics}>Exportar diagnóstico</button>
    <button className="secondary" onClick={() => void clear()}>Limpar dados reais</button>
  </section>;
}

function Overview({ data }: { data: GameSnapshot }) {
  const { character, hunts } = data;
  return <><header><small>PERSONAGEM</small><h2>{character.name}</h2><p>{character.vocation} · Level {character.level}</p></header>
    <div className="metrics"><Metric label="Talentos" value={`${character.talentPoints} pts`} /><Metric label="Equipamentos" value={`${character.equipment.length}/10`} /></div>
    <section className="card"><h3>Equipamentos & imbuements</h3>{character.equipment.map((item) => <div className="row" key={item.slot}><div><small>{item.slot}</small><strong>{item.name}</strong></div><span>{item.imbuements.join(' · ')}</span></div>)}</section>
    <section className="card accent"><small>HUNT ATUAL · DEMO</small><h3>{hunts[0]?.name ?? 'Nenhuma hunt'}</h3>{hunts[0] && <div className="metrics"><Metric label="XP/h estimada" value={formatNumber(hunts[0].estimatedXpHour)} /><Metric label="Gold/h estimado" value={formatNumber(hunts[0].estimatedGoldHour)} /></div>}</section></>;
}
function Hunts({ data, showCompatibility, local }: { data: GameSnapshot; showCompatibility: boolean; local: LocalData }) {
  const imported = local.catalog?.catalog.hunts; const hunts = imported?.length ? imported : data.hunts;
  const source = imported?.length ? 'Imported catalog' : 'Demo';
  if (!hunts.length) return <EmptyState message="Importe um catálogo local ou use o modo demo." />;
  const recommendations = recommendHunts(data.character.level, local.damageProfile, hunts, local.catalog?.catalog.server);
  return <><header><small>{source.toUpperCase()}</small><h2>Hunts recomendadas</h2><p>Valores são estimativas; teto teórico não é resultado medido.</p></header>{hunts.map((hunt) => { const recommendation = recommendations.find((item) => item.huntId === hunt.id); return <section className="card hunt" key={hunt.id}><div><h3>{hunt.name}</h3><small>Level mínimo {hunt.minimumLevel} · Resistência {hunt.relevantResistance} · {recommendation?.kind ?? 'unavailable'}</small></div>{showCompatibility && <strong className="score">{hunt.compatibility}%</strong>}<div className="metrics"><Metric label="XP/h estimada" value={formatNumber(recommendation?.value ?? 0)} /><Metric label="Gold/h catálogo" value={formatNumber(hunt.estimatedGoldHour)} /></div><p>Confiança: {recommendation?.confidence ?? 'none'} · {recommendation?.explanation}</p></section>; })}</>;
}
const labels = { protect: 'Proteger', protected: 'Protegido', review: 'Revisar', sellable: 'Candidato a venda', 'sell-candidate': 'Candidato a venda', supply: 'Supply', unknown: 'Desconhecido' };
function Inventory({ data, local }: { data: GameSnapshot; local: LocalData }) {
  return <><header><small>DEMO · REGRAS LOCAIS</small><h2>Inventário</h2><p>Somente leitura — nenhuma ação de venda disponível.</p></header><section className="card">{data.inventory.map((item) => { const result = classifyItem(item, local.inventoryRules, local.overrides); return <div className="row item" key={item.id}><div><strong>{item.name}</strong><small>{item.rarity} · {result.reason}</small></div><span className={`tag ${result.classification}`}>{labels[result.classification]}</span></div>; })}</section></>;
}
function Combat({ data, showBreakdown }: { data: GameSnapshot; showBreakdown: boolean }) {
  const c = data.combat;
  return <><header><small>SESSÃO SIMULADA</small><h2>Combate</h2><p>Duração {formatDuration(c.durationSeconds)}</p></header><div className="metrics combat"><Metric label="Dano total" value={formatNumber(c.totalDamage)} /><Metric label="DPS" value={formatNumber(c.dps)} /><Metric label="XP/h" value={formatNumber(c.xpHour)} /><Metric label="Gold/h" value={formatNumber(c.goldHour)} /></div>{showBreakdown && <><Breakdown title="Dano por personagem" data={c.byCharacter} /><Breakdown title="Dano por elemento" data={c.byElement} /></>}</>;
}
function SettingsPage({ settings, onChange, local, onLocalChange }: { settings: Settings; onChange: (value: Settings) => void; local: LocalData; onLocalChange: (value: LocalData) => void }) {
  const update = (patch: Partial<Settings>) => { const next = { ...settings, ...patch }; onChange(next); void settingsStore.save(next); };
  const saveLocal = (next: LocalData) => { onLocalChange(next); void localDataStore.save(next); };
  const importCatalog = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const catalog = await parseLocalCatalog(file); saveLocal({ ...local, catalog, catalogHistory: [catalog, ...local.catalogHistory].slice(0, 10) }); } catch (reason) { window.alert(reason instanceof Error ? reason.message : 'Falha ao importar catálogo.'); } finally { event.target.value = ''; } };
  const exportData = async () => { const blob = new Blob([await localDataStore.export()], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'baiak-idle-companion-backup.json'; link.click(); URL.revokeObjectURL(link.href); };
  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { if (!window.confirm('Substituir dados locais pelo backup selecionado?')) return; onLocalChange(await localDataStore.import(await file.text())); } catch (reason) { window.alert(reason instanceof Error ? reason.message : 'Backup inválido.'); } finally { event.target.value = ''; } };
  return <><header><small>PREFERÊNCIAS LOCAIS</small><h2>Settings</h2><p>Dados permanecem somente neste dispositivo.</p></header><section className="card settings">
    <label>Mostrar compatibilidade<input type="checkbox" checked={settings.showCompatibility} onChange={(e) => update({ showCompatibility: e.target.checked })} /></label>
    <label>Detalhes de combate<input type="checkbox" checked={settings.showCombatBreakdown} onChange={(e) => update({ showCombatBreakdown: e.target.checked })} /></label>
    <label>Notificações<input type="checkbox" checked={settings.notifications} onChange={(e) => update({ notifications: e.target.checked })} /></label>
    <label>Tema<select aria-label="Tema" value={settings.theme} onChange={(e) => update({ theme: e.target.value as Theme })}><option value="dark">Escuro</option><option value="light">Claro</option><option value="system">Sistema</option></select></label>
    <button onClick={() => void settingsStore.clearDemoData()}>Limpar dados simulados</button>
    <button className="secondary" onClick={() => { void settingsStore.reset(); onChange(defaultSettings); }}>Restaurar padrões</button>
  </section><section className="card settings"><h3>Perfil de dano manual</h3><p>Origem: {local.damageOrigin}. Soma: {Math.round(Object.values(local.damageProfile.elements).reduce((sum, value) => sum + (value ?? 0), 0) * 100)}%</p><label>Physical %<input aria-label="Physical %" type="number" min="0" max="100" value={(local.damageProfile.elements.physical ?? 0) * 100} onChange={(event) => saveLocal({ ...local, damageOrigin: 'manual', damageProfile: { elements: { ...local.damageProfile.elements, physical: Number(event.target.value) / 100 } } })} /></label><button className="secondary" onClick={() => saveLocal({ ...local, damageProfile: defaultProfile, damageOrigin: 'demo' })}>Restaurar perfil demo</button></section><section className="card settings"><h3>Catálogo local</h3><p>{local.catalog ? `${local.catalog.fileName ?? 'Arquivo local'} · v${local.catalog.catalog.version} · ${local.catalog.checksum.slice(0, 12)}…` : 'Nenhum catálogo importado.'}</p><label>Importar JSON<input aria-label="Importar catálogo" type="file" accept="application/json,.json" onChange={(event) => void importCatalog(event)} /></label>{local.catalog && <button onClick={() => { if (window.confirm('Remover o catálogo ativo?')) saveLocal({ ...local, catalog: undefined }); }}>Remover catálogo</button>}</section><section className="card settings"><h3>Dados locais</h3><p>Side panel: enabled · Local storage: enabled · DOM game integration: not enabled · Automated actions: not supported</p><button onClick={() => void exportData()}>Exportar dados locais</button><label>Importar backup<input aria-label="Importar backup" type="file" accept="application/json,.json" onChange={(event) => void importBackup(event)} /></label><button className="secondary" onClick={() => { if (window.confirm('Limpar todos os dados locais?')) { void localDataStore.clear(); onLocalChange({ ...local, catalog: undefined, catalogHistory: [], inventoryRules: [], overrides: {}, snapshots: [], recommendations: [] }); } }}>Limpar dados locais</button></section></>;
}
export function App() {
  const [page, setPage] = useState<Page>('Overview');
  const [data, setData] = useState<GameSnapshot>();
  const [settings, setSettings] = useState(defaultSettings);
  const [error, setError] = useState('');
  const [local, setLocal] = useState<LocalData>();
  const [live, setLive] = useState<LiveIntegrationState>(defaultLiveState);
  useEffect(() => { Promise.all([provider.readSnapshot(), settingsStore.load(), localDataStore.load()]).then(([result, stored, storedLocal]) => { if (!result.value) throw new Error(result.errors[0] ?? 'Dados indisponíveis'); setData(result.value); setSettings(stored); setLocal(storedLocal); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Erro desconhecido')); }, []);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme; }, [settings.theme]);
  useEffect(() => {
    if (!globalThis.chrome?.runtime) return;
    void chrome.runtime.sendMessage(createMessage('state-request', 'side-panel', {})).then((state: LiveIntegrationState | undefined) => { if (state) setLive(state); });
    const listener = (message: unknown) => { if (isLiveMessage(message) && message.type === 'integration-state' && message.origin === 'background') setLive(message.payload); };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);
  let content = <LoadingState />;
  if (error) content = <ErrorState message={error} />;
  else if (data && local) {
    if (page === 'Overview') content = <Overview data={data} />;
    if (page === 'Hunts') content = <Hunts data={data} showCompatibility={settings.showCompatibility} local={local} />;
    if (page === 'Inventory') content = <Inventory data={data} local={local} />;
    if (page === 'Combat') content = <Combat data={data} showBreakdown={settings.showCombatBreakdown} />;
    if (page === 'Settings') content = <SettingsPage settings={settings} onChange={setSettings} local={local} onLocalChange={setLocal} />;
  }
  return <div className="app"><aside><div className="brand"><b>B</b><span>Baiak<br /><strong>Companion</strong></span></div><span className="demo">● Demo mode</span><nav>{pages.map((item) => <button aria-current={page === item ? 'page' : undefined} key={item} onClick={() => setPage(item)}><i>{icons[item]}</i>{item}</button>)}</nav><footer>READ-ONLY · v0.1</footer></aside><main>{page === 'Overview' || page === 'Settings' ? <LiveDomPanel live={live} settings={settings} onSettings={setSettings} onLive={setLive} /> : null}{content}</main></div>;
}
