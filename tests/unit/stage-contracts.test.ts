import { getStageRequirements, loadStageContract } from '../../src/core/contract-ai/templates/contracts';

describe('Stage contracts', () => {
  it('loads stage contract JSON for known stage', () => {
    const contract = loadStageContract('tests');
    expect(contract).not.toBeNull();
    expect(contract!.stage).toBe('tests');
    expect(contract!.$schema).toBe('partial-contract');
  });

  it('getStageRequirements includes forbidden frameworks for tests stage', () => {
    const text = getStageRequirements('tests');
    expect(text).toContain('## Stage: tests');
    expect(text).toContain('Forbidden:');
    expect(text).toContain('Frameworks:');
    expect(text).toContain('playwright');
  });

  it('getStageRequirements returns empty string for unknown stage', () => {
    const text = getStageRequirements('does-not-exist');
    expect(text).toBe('');
  });
});
