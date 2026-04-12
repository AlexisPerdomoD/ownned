/**
 * @typedef {"folder" | "file"} NodeType
 */

/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {string} usr_id
 * @property {string} name
 * @property {NodeType} type
 * @property {string} description
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} NodeComment
 * @property {string} id
 * @property {string} node_id
 * @property {string} usr_id
 * @property {string} content
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Doc
 * @property {string} id
 * @property {string} node_id
 * @property {string} title
 * @property {string} description
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Node & {children: Node[];type: "folder"} Folder
 * @typedef {Node & {doc: Doc; type: "file"}} File
 */

export {}
