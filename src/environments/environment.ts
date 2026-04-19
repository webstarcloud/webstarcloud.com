// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
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

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
