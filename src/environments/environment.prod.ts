export const environment = {
  production: true,
  api: {
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
