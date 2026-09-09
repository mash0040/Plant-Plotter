const jwt = require('jsonwebtoken');

const DEVELOPMENT_AUTH_COOKIE_NAME = 'plantplotter_session';
const PRODUCTION_AUTH_COOKIE_NAME = '__Host-plantplotter_session';

const isProduction = () => process.env.NODE_ENV === 'production';

const getAuthCookieName = () => (
  isProduction() ? PRODUCTION_AUTH_COOKIE_NAME : DEVELOPMENT_AUTH_COOKIE_NAME
);

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax',
  path: '/'
});

const getTokenMaxAge = (token) => {
  const decodedToken = jwt.decode(token);

  if (!decodedToken?.exp) {
    return undefined;
  }

  return Math.max((decodedToken.exp * 1000) - Date.now(), 0);
};

const setAuthCookie = (res, token) => {
  const maxAge = getTokenMaxAge(token);
  const options = {
    ...getAuthCookieOptions(),
    ...(maxAge !== undefined && { maxAge })
  };

  res.cookie(getAuthCookieName(), token, options);
};

const clearAuthCookie = (res) => {
  res.clearCookie(getAuthCookieName(), getAuthCookieOptions());
};

module.exports = {
  DEVELOPMENT_AUTH_COOKIE_NAME,
  PRODUCTION_AUTH_COOKIE_NAME,
  clearAuthCookie,
  getAuthCookieName,
  getAuthCookieOptions,
  getTokenMaxAge,
  setAuthCookie
};
