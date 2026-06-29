import { Router, type RequestHandler } from 'express';

/**
 * Demo-only helpers for the example apps (mounted outside production).
 * In the real B2B model this "creator directory" is the integrator's own data;
 * here we serve a small static list so the sample app has friends to call.
 */
const CREATORS = [
  { id: 'cr_aanya', name: 'Aanya Sharma', handle: '@aanya.sings', number: '+919811112233' },
  { id: 'cr_kabir', name: 'Kabir Mehra', handle: '@kabir.games', number: '+919822223344' },
  { id: 'cr_isha', name: 'Isha Kapoor', handle: '@ishadance', number: '+919833334455' },
  { id: 'cr_rohan', name: 'Rohan Verma', handle: '@rohan.fit', number: '+919844445566' },
];

export function createDemoRouter(requireCaller: RequestHandler): Router {
  const router = Router();

  // The app fetches this with its client token, like it would hit the integrator's API.
  router.get('/demo/creators', requireCaller, (_req, res) => {
    res.status(200).json({ creators: CREATORS });
  });

  return router;
}
