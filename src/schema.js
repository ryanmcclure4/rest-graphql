/**
 * Schema class
 * @flow
 */

import {
  GraphQLList,
  GraphQLObjectType,
} from 'graphql';
import Node, {
  type NodeConfig,
  type Expansion,
} from './Node';

export type SchemaConfig = {
  [string]: NodeConfig,
};

export type Graph = {
  [string]: Node,
};

/**
 * Schema
 */
class Schema {
  _graph: Graph;

  /**
   * Constructor
   */
  constructor(schema: Object, config: SchemaConfig = { }) {
    if (! schema) throw Error('GraphQL Schema must be provided');
    const types = schema.getTypeMap();

    this._graph = { };

    // Build nodes
    Object.keys(types).forEach(field => {
      const type = types[field];
      if (type instanceof GraphQLObjectType || type instanceof GraphQLList) {
        const { name } = type;
        const conf = config[name];
        this._graph[name] = new Node({ field, type, config: conf });
      }
    });
  }

  /**
   * Gets a node fragment
   */
  getFragment = (name: string, expand: Expansion = { }, ancestors: string[] = [ ]): string => {
    const node = this._graph[name];

    if (! node) throw Error(`${name} does not exist`);

    return node.getFragment(this._graph, expand, ancestors);
  }
}

export default Schema;
