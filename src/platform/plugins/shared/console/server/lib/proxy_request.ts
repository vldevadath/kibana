/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import https from 'https';
import net from 'net';
import stream from 'stream';
import Boom from '@hapi/boom';
import { URL } from 'url';
import { sanitizeHostname } from './utils';

interface Args {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
  agent: http.Agent;
  uri: URL;
  payload: stream.Stream;
  timeout: number;
  headers: http.OutgoingHttpHeaders;
  rejectUnauthorized?: boolean;
}

// We use a modified version of Hapi's Wreck because Hapi, Axios, and Superagent don't support GET requests
// with bodies, but ES APIs do. Similarly with DELETE requests with bodies. Another library, `request`
// diverged too much from current behaviour.
export const proxyRequest = ({
  method,
  headers,
  agent,
  uri,
  timeout,
  payload,
  rejectUnauthorized,
}: Args) => {
  const { hostname, port, protocol, search, pathname } = uri;
  const client = uri.protocol === 'https:' ? https : http;

  let resolved = false;

  let resolve: (res: http.IncomingMessage) => void;
  let reject: (res: unknown) => void;
  const reqPromise = new Promise<http.IncomingMessage>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const finalUserHeaders = { ...headers };
  const hasHostHeader = Object.keys(finalUserHeaders).some((key) => key.toLowerCase() === 'host');
  if (!hasHostHeader) {
    finalUserHeaders.host = hostname;
  }

  const parsedPort = port === '' ? undefined : parseInt(port, 10);
  const req = client.request({
    method: method.toUpperCase(),
    // We support overriding this on a per request basis to support legacy proxy config. See ./proxy_config.
    rejectUnauthorized: typeof rejectUnauthorized === 'boolean' ? rejectUnauthorized : undefined,
    host: sanitizeHostname(hostname),
    port: parsedPort,
    protocol,
    path: `${pathname}${search || ''}`,
    headers: {
      ...finalUserHeaders,
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
    },
    agent,
  });

  req.once('response', (res) => {
    resolved = true;
    resolve(res);
  });

  req.once('socket', (socket: net.Socket) => {
    if (!socket.connecting) {
      payload.pipe(req);
    } else {
      socket.once('connect', () => {
        payload.pipe(req);
      });
    }
  });

  const onError = (e: Error) => reject(e);
  req.once('error', onError);

  const timeoutPromise = new Promise<any>((timeoutResolve, timeoutReject) => {
    setTimeout(() => {
      // Destroy the stream on timeout and close the connection.
      if (!req.destroyed) {
        req.destroy();
      }
      if (!resolved) {
        const request = `${req.method} ${req.path}`;
        const requestPath = `${req.protocol}//${req.host}${parsedPort ? `:${parsedPort}` : ''}`;

        timeoutReject(
          Boom.gatewayTimeout(`Client request timeout for: ${requestPath} with request ${request}`)
        );
      } else {
        timeoutResolve(undefined);
      }
    }, timeout);
  });

  return Promise.race<http.IncomingMessage>([reqPromise, timeoutPromise]);
};
