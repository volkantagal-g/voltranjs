import React from 'react';
import { hydrateRoot } from 'react-dom/client';

import ClientApp from '../components/ClientApp';
import { WINDOW_GLOBAL_PARAMS } from '../utils/constants';
import { createComponentName } from '../utils/helper';
import piramiteConfig from '../../../piramite.config';

const getStaticProps = () => {
  const staticProps = {};

  if (piramiteConfig.staticProps) {
    piramiteConfig.staticProps.map(property => {
      staticProps[property.name] = property.value;
    });
  }

  return staticProps;
};

const withBaseComponent = (PageComponent, pathName) => {
  const componentName = createComponentName(pathName);
  const prefix = piramiteConfig.prefix.toUpperCase();

  if (process.env.BROWSER && window[prefix] && window[prefix][componentName.toUpperCase()]) {
    const fragments = window[prefix][componentName.toUpperCase()];
    const history = window[WINDOW_GLOBAL_PARAMS.HISTORY];
    const staticProps = getStaticProps();

    Object.keys(fragments).forEach(id => {
      const componentEl = document.getElementById(`${componentName}_${id}`);
      const isHydrated = componentEl && !!componentEl.getAttribute('piramite-hydrated');

      if (isHydrated || !componentEl) return;

      const initialState = fragments[id].STATE;

      hydrateRoot(
        componentEl,
        <HydratedClientApp
          PageComponent={PageComponent}
          staticProps={staticProps}
          initialState={initialState}
          history={history}
          componentEl={componentEl}
        />
      );
    });
  }

  return props => {
    return <PageComponent {...props} />;
  };
};

// Helper component to handle post-hydration logic
function HydratedClientApp({ PageComponent, staticProps, initialState, history, componentEl }) {
  React.useEffect(() => {
    const el = componentEl;
    if (el) {
      el.style.pointerEvents = 'auto';
      el.setAttribute('piramite-hydrated', 'true');
    }
  }, [componentEl]);
  return (
    <ClientApp>
      <PageComponent {...staticProps} initialState={initialState} history={history} />
    </ClientApp>
  );
}

export default withBaseComponent;
