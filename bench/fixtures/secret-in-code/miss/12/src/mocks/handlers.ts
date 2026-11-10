import { http, HttpResponse } from 'msw';
export const handlers = [
  http.get('https://api.github.com/user', ({ request }) => {
    if (request.headers.get('authorization') !== 'token ghp_Z1FYqW420rFn4cMCuTpsYx33rEYV0pVKIKbs') return new HttpResponse(null, { status: 401 });
    return HttpResponse.json({ login: 'octocat' });
  }),
];
