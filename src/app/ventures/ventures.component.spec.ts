import { VenturesComponent } from './ventures.component';

describe('VenturesComponent', () => {
  it('presents AnchorKeep as the lead venture', () => {
    const component = new VenturesComponent();

    expect(component.ventures[0]).toEqual(jasmine.objectContaining({
      name: 'AnchorKeep',
      stage: 'Lead venture',
      route: '/ventures/anchorkeep'
    }));
  });
});
