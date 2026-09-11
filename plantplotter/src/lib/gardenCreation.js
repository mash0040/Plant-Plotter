export const TRACKER_CREATE_GARDEN_URL = '/gardens?create=true&returnTo=/tracker';

// Keep return navigation restricted to explicitly supported application routes.
export const getGardenCreationReturnPath = (returnTo) => (
  returnTo === '/tracker' ? '/tracker' : null
);
