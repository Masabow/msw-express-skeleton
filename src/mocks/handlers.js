import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api', () => {
    return HttpResponse.json({ message: 'Hello from MSW!' });
  }),
];
