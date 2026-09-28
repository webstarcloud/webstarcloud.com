export const environment = {
  chatEndpoint: 'https://1m35ubpz0i.execute-api.eu-west-1.amazonaws.com/prod/v1/chat',
  fundingApiUrl: '', // Public service origin only. Never put payment or compute secrets here.
  production: true,
  api: {
    inspectionUrl: 'https://clzngwfhz1.execute-api.eu-west-1.amazonaws.com/test',
    baseUrl: 'https://clzngwfhz1.execute-api.eu-west-1.amazonaws.com/test',
    gatewayKey: 'rSxnSS5RnZ4HqW1lxzY1T8py4F0hYoLH9sVFTqHI'
  },
  auth: {
    enabled: true,
    authority: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_7xPJnzHOb',
    hostedUiDomain: 'https://eu-west-17xpjnzhob.auth.eu-west-1.amazoncognito.com',
    clientId: '1mga84eqplp3s0ujt2ovd3odac',
    identityProvider: 'Google',
    scope: 'openid email profile',
    responseType: 'code',
    redirectPath: '',
    postLogoutRedirectPath: ''
  }
};
