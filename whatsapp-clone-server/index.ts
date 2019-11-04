import { ApolloServer, PubSub } from 'apollo-server-express';
import cookie from 'cookie';
import { app } from './app';
import { origin, port, secret } from './env';
import http from 'http';
import jwt from 'jsonwebtoken';
import { users } from './db';
import schema from './schema';

const getAuthenticatedUser = (cookies: any) => {
  const username = jwt.verify(cookies.authToken, secret) as string;
  return (username && users.find(u => u.username === username)) || null;
}

const pubsub = new PubSub();
const server = new ApolloServer({
  schema,
  context: session => {
    const req = session.connection
      ? session.connection.context.request
      : session.req;

    req.cookies = session.connection
      ? cookie.parse(req.headers.cookies || '')
      : req.cookies

    const currentUser = (req.cookies.authToken && getAuthenticatedUser(req.cookies))
    return {
      currentUser,
      pubsub,
      res: session.res
    };
  },
  subscriptions: {
    onConnect: (_, __, {request}) => ({request})
  },
});

server.applyMiddleware({
  app,
  path: '/graphql',
  cors: { credentials: true, origin },
});

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
