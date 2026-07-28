import { DomGameAdapter, MockGameAdapter } from './index';
import { mockSnapshot } from '../../../apps/extension/src/features/mockData';

describe('DomGameAdapter', () => {
  it('reads a complete sanitized fixture defensively', async () => {
    document.body.innerHTML = '<b data-character-name>Demo</b><b data-vocation>Knight</b><b data-level>100</b><b data-talent-points>3</b><b data-current-hunt>Test Hunt</b><i data-equipment-slot="weapon" data-name="Sword" data-imbuements="Void III"></i>';
    const result = await new DomGameAdapter(document).readCharacter();
    expect(result.source).toBe('real'); expect(result.confidence).toBe('high'); expect(result.value?.equipment[0]?.name).toBe('Sword');
  });
  it('makes changed or invalid DOM unavailable instead of throwing', async () => {
    document.body.innerHTML = '<b data-level>many</b>';
    const result = await new DomGameAdapter(document).readCharacter();
    expect(result.confidence).toBe('low'); expect(result.errors).toHaveLength(1);
  });
  it('marks mock data as demo', async () => expect((await new MockGameAdapter(mockSnapshot).readSnapshot()).source).toBe('demo'));
});
