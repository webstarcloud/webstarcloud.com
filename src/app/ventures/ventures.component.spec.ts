import { VenturesComponent } from './ventures.component';

describe('VenturesComponent', () => {
  it('presents Agent API Hardening as the working preview', () => {
    const component = new VenturesComponent();

    expect(component.ventures[0]).toEqual(jasmine.objectContaining({
      name: 'Agent API Hardening / Blacksmith',
      stage: 'Working preview',
      boundary: 'Capability boundary'
    }));
  });
});
