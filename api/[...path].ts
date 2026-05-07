import { createDevApiMiddleware } from '../server/devApiMiddleware.ts';

const apiMiddleware = createDevApiMiddleware();

export default async function handler(request: any, response: any) {
  try {
    await apiMiddleware(request, response, () => {
      response.statusCode = 404;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({
        error: {
          code: 'API_ROUTE_NOT_FOUND',
          message: `No API route exists for ${request.url ?? 'this request'}.`,
        },
      }));
    });
  } catch (error) {
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({
      error: {
        code: 'API_FUNCTION_ERROR',
        message: error instanceof Error ? error.message : 'The API function failed.',
      },
    }));
  }
}
