// src/lib/hasuraClient.js
require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');

/**
 * Required envs (from your .env):
 *  - HASURA_GRAPHQL_ENDPOINT=https://guiding-sawfish-63.hasura.app/v1/graphql
 *  - HASURA_ADMIN_SECRET=...
 *  - (optional) HASURA_JWT=...   // if you use JWT auth
 */
const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
if (!endpoint) throw new Error('Missing HASURA_GRAPHQL_ENDPOINT');

const headers = {};
if (process.env.HASURA_ADMIN_SECRET) {
  headers['x-hasura-admin-secret'] = process.env.HASURA_ADMIN_SECRET;
}
if (process.env.HASURA_JWT) {
  headers.Authorization = `Bearer ${process.env.HASURA_JWT}`;
}

const client = new GraphQLClient(endpoint, { headers });

/** Generic request wrapper (returns { data, errors } semantics if you like) */
async function request(query, variables = {}) {
  try {
    const data = await client.request(query, variables);
    return { data, errors: null };
  } catch (err) {
    // normalize graphql-request errors
    const errors = err?.response?.errors || [{ message: err.message }];
    return { data: null, errors };
  }
}

/** Ready-to-use sample documents (adjust to your schema) */
const Q_HEALTH = gql`query { __typename }`;

const Q_GET_USERS = gql`
  query GetUsers($limit: Int = 10) {
    users(limit: $limit) { id username email }
  }
`;

const M_INSERT_USER = gql`
  mutation InsertUser($object: users_insert_input!) {
    insert_users_one(object: $object) { id username email }
  }
`;

/** Convenience helpers */
async function hasuraHealth() {
  return request(Q_HEALTH);
}

async function listUsers(limit = 10) {
  return request(Q_GET_USERS, { limit });
}

async function createUser({ username, passwordHash, email }) {
  return request(M_INSERT_USER, {
    object: { username, password: passwordHash, email },
  });
}

module.exports = {
  gql,
  client,
  request,
  // sample docs
  Q_HEALTH,
  Q_GET_USERS,
  M_INSERT_USER,
  // sample helpers
  hasuraHealth,
  listUsers,
  createUser,
};
