/**
 * @typedef {'read_only_access' | 'write_access' | 'owner_access'} GroupUsrAccess
 */

/**
 * @typedef {Object} Group
 * @property {string} id
 * @property {string} usr_id
 * @property {string} name
 * @property {string} description
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} GroupUsr
 * @property {string} group_id
 * @property {string} usr_id
 * @property {GroupUsrAccess} access
 * @property {string} assign_date
 */

/**
 * @typedef {Object} GroupNode
 * @property {string} group_id
 * @property {string} node_id
 * @property {string} assign_date
 */

/**
 * @typedef {Group & {nodes: GroupNode[], usrs: GroupUsr[]}} PopulatedGroup
 */

export {}
