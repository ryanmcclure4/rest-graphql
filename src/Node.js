/**
 * Node class
 * @flow
 */

import {
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLObjectType,
} from 'graphql';
import snakeCase from 'snake-case';
import {
  listFragmentWrapper,
  objectFragmentWrapper,
  connectionFragmentWrapper,
} from './fragments';

export type Arguments = { [string]: string | number | string[] };

export type Expansion = {
  args?: Arguments,
  [string]: Expansion,
};

export type NodeConfig = {
  whitelist?: string[],
  expandable?: string[],
};

export type NodeField = {
  name: string,
  description: string,
  args: Object[],
  type: Object,
  [string]: any,
};

/**
 * Node
 */
class Node {
  _name: string;
  _fields: { [string]: NodeField };
  _fragment: string;
  _config: NodeConfig;

  /**
   * Constructor
   */
  constructor(
    { field, type, config }:
    { field: NodeField, type: Object, config?: NodeConfig },
  ) {
    this._name = field.name;
    this._fields = type.getFields();
    this._config = config || { };
  }

  /**
   * Gets fields for this node
   */
  _getFields = (): string[] => {
    const { whitelist } = this._config;
    const fields = Object.keys(this._fields);

    if (whitelist) {
      return fields.filter(field =>
        whitelist.includes(this._fields[field].name),
      );
    }

    return fields;
  }

  /**
   * Determines whether a field is expandable
   */
  _canExpand = (field: string): boolean => {
    const { expandable } = this._config;

    if (expandable) return expandable.includes(field);

    return true;
  }

  _coerceArg = (field: NodeField, argType: any, arg: any): any => {
    if (
      argType === GraphQLString ||
      argType === GraphQLID ||
      (!(argType instanceof GraphQLList) && argType.ofType === GraphQLID)
    ) {
      return `"${String(arg)}"`;
    }

    if ((argType === GraphQLInt) && isNaN(arg)) {
      throw new Error(`Argument ${argType.name} on ${field.name} must be of type Number`);
    }

    if (argType instanceof GraphQLList) {
      if (! Array.isArray(arg)) {
        throw new Error(
          `Argument ${argType.name} on ${field.name} must be an array of ${argType.ofType}`,
        );
      }

      return `[${arg.map(a => this._coerceArg(field, argType.ofType, a)).join(', ')}]`;
    }

    return String(arg);
  }

  /**
   * Validates arguments passed to a query
   */
  _formatArgs = (field: NodeField, args?: Arguments): string => {
    if (! args || args === 'false' || ! Object.keys(args).length) return '';
    const fieldArgs = { };
    const validArgs = { };

    field.args.forEach(arg => {
      fieldArgs[arg.name] = arg;
      if (args && args[arg.name]) validArgs[arg.name] = args[arg.name];
    });

    return `(${
      String(Object.keys(validArgs).map(arg =>
        `${arg}: ${this._coerceArg(field, fieldArgs[arg].type, args[arg])}`,
      ).join(', '))
    })`;
  }

  /**
   * Gets a fragment and expands indicated fields
   */
  getFragment = (graph: Graph, expand : Expansion = { }, ancestors : string[] = [ ]): string => {
    const fragment = `${this._getFields().map(key => {
      const field = this._fields[key];
      const { name, type } = field;
      const canExpand = this._canExpand(name);

      // Check for list type
      if (type instanceof GraphQLList && canExpand) {
        const expansion = expand[name];

        if (expansion) {
          const typeName = type.ofType;
          const node = graph[typeName];
          if (! node) return null;
          const args = this._formatArgs(field, expansion.args);
          const listFragment = node.getFragment(graph, expand[name], ancestors);

          return listFragmentWrapper(name, args, listFragment);
        }

        return null;
      }

      // Check for object and connection type
      if (type instanceof GraphQLObjectType) {
        const expansion = expand[name];

        // Connection type
        if (type.getFields().edges && canExpand) {

          if (expansion) {
            const typeName = snakeCase(name.replace(/s$/, ''));
            const node = graph[typeName];
            if (! node) return null;
            const args = this._formatArgs(field, expansion.args);
            const connectionFragment = node.getFragment(graph, expand[name], ancestors);

            return connectionFragmentWrapper(name, args, connectionFragment);
          }

          return null;
        }

        // Object type
        if (expansion) {
          const node = graph[type.name];
          if (! node) return null;
          const args = this._formatArgs(field, expansion.args);
          const objectFragment = node.getFragment(graph, expand[name], ancestors);

          return objectFragmentWrapper(name, args, objectFragment);
        }

        return null;
      }

      return `${name}`;
    }).filter(field => field !== null).join('\n')}`;

    return fragment;
  }
}

export default Node;
