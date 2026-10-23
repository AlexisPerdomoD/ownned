/**
 * Pure frontend authorization helpers.
 *
 * Semantics (see `doc/frontend/canonical-flows.md` → "Modelo de autorización para la UI"):
 *  1. **Role** is the global capability ceiling of the account. It never grants access by itself.
 *  2. **Assignment** (`access_level`) is the highest applicable grant level for the resource.
 *  3. **Effective authorization** for a resource action =
 *     role allows the action AND assignment is sufficient for the action.
 * Global actions (e.g. user administration) are authorized by role alone.
 *
 * These helpers are UI gating ONLY: they decide which affordances to render.
 * The backend remains the authority and its `403` responses must always be honored.
 * No generic policy engine: small, explicit functions matching the backend domain.
 *
 * @module shared/authz
 */

/**
 * @typedef {'super_usr_role' | 'normal_usr_role' | 'limited_usr_role'} UsrRole
 */

/**
 * @typedef {'read_only_access' | 'write_access' | 'write_delete_access' | 'owner_access'} GroupUsrAccess
 */

/**
 * Ranked access levels, mirroring `internal/domain/group.go` (`GroupAccessRank`).
 * Levels group capabilities; they are NOT per-operation toggles.
 *
 * @type {Record<GroupUsrAccess, number>}
 */
const ACCESS_RANK = {
    read_only_access: 1,
    write_access: 2,
    write_delete_access: 3,
    owner_access: 4
}

/**
 * Role capability *ceiling*, expressed as the highest access rank the role can
 * ever hold or act on. Mirrors the backend: `limited_usr_role` can only ever
 * hold/act on `read_only_access` grants.
 *
 * @see internal/domain/group.go IsValidAccessToRole
 * @param {UsrRole | null | undefined} role
 * @returns {number}
 */
function roleCeilingRank(role) {
    switch (role) {
        case 'limited_usr_role':
            return ACCESS_RANK.read_only_access
        case 'normal_usr_role':
        case 'super_usr_role':
            return ACCESS_RANK.owner_access
        default:
            return 0
    }
}

/**
 * Whether the role entity can be assigned to groups at all,
 * mirroring `UsrRole.CanAssignGroupUsr`.
 *
 * @param {UsrRole | null | undefined} role
 * @returns {boolean}
 */
export function canAssignGroupUsr(role) {
    return role === 'super_usr_role' || role === 'normal_usr_role'
}

/**
 * Whether an access level is valid assignment for a target role,
 * mirroring `GroupUsrAccess.IsValidAccessToRole`. Used to prune invalid
 * options in assignment forms; the backend still validates everything.
 *
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @param {UsrRole | null | undefined} targetRole
 * @returns {boolean}
 */
export function isValidAccessForRole(accessLevel, targetRole) {
    if (targetRole === 'super_usr_role') return false
    if (targetRole === 'limited_usr_role') return accessLevel === 'read_only_access'
    if (targetRole === 'normal_usr_role') return hasKnownAccess(accessLevel)
    return false
}

/**
 * True when `accessLevel` is a known access level.
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {boolean}
 */
export function hasKnownAccess(accessLevel) {
    return accessLevel != null && ACCESS_RANK[accessLevel] != null
}

/**
 * Effective rank for a user on a resource: assignment rank clamped by the role
 * ceiling. Unknown/absent assignment yields rank 0 (no actions require > 0 to
 * succeed when supplied here — see each helper).
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {number}
 */
function effectiveRank(role, accessLevel) {
    if (!role || !hasKnownAccess(accessLevel)) return 0
    return Math.min(ACCESS_RANK[accessLevel], roleCeilingRank(role))
}

/**
 * Generic resource-action check. Requirement semantics per affordance table:
 * read/comment/download need read-only or better; create folder / upload /
 * edit / delete need write or better (write_delete_access and owner imply it).
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @param {number} requiredRank 1=read, 2=write+
 * @returns {boolean}
 */
function rankAllows(role, accessLevel, requiredRank) {
    return effectiveRank(role, accessLevel) >= requiredRank
}

/**
 * View/list/download a node or document (and its children) with read context.
 * Also covers global "see the resource exists" affordances.
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {boolean}
 */
export function canReadNode(role, accessLevel) {
    return rankAllows(role, accessLevel, ACCESS_RANK.read_only_access)
}

/**
 * Create a comment on a node. Requires read access, PLUS the confirmed product
 * rule D1: `limited_usr_role` cannot create comments even with read-only
 * access (the backend contract currently still allows it; the UI gates it and
 * the backend fix is out of frontend scope).
 *
 * NOTE: comment edit/delete are ownership rules, not access-level rules —
 * do not use rank helpers for them.
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {boolean}
 */
export function canCommentOnNode(role, accessLevel) {
    if (role === 'limited_usr_role') return false
    return canReadNode(role, accessLevel)
}

/**
 * Create a folder inside a node.
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {boolean}
 */
export function canCreateFolder(role, accessLevel) {
    return rankAllows(role, accessLevel, ACCESS_RANK.write_access)
}

/**
 * Upload a document into a node.
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {boolean}
 */
export function canUploadDoc(role, accessLevel) {
    return rankAllows(role, accessLevel, ACCESS_RANK.write_access)
}

/**
 * Edit/update a node (rename/description).
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {boolean}
 */
export function canEditNode(role, accessLevel) {
    return rankAllows(role, accessLevel, ACCESS_RANK.write_access)
}

/**
 * Delete a node (recursively for folders) or its documents.
 *
 * @param {UsrRole | null | undefined} role
 * @param {GroupUsrAccess | undefined | null} accessLevel
 * @returns {boolean}
 */
export function canDeleteNode(role, accessLevel) {
    return rankAllows(role, accessLevel, ACCESS_RANK.write_access)
}

/**
 * Manage group members (assign/unassign users into a group). Also requires
 * sufficient group access backend-side, which the UI cannot infer from the
 * node access; mirror the actor-role rule of `UsrRole.CanAssignGroupUsr`.
 *
 * @param {UsrRole | null | undefined} role
 * @returns {boolean}
 */
export function canManageGroupUsrs(role) {
    return canAssignGroupUsr(role)
}

/**
 * Share/unshare nodes with a group. Same actor-role rule as group members.
 *
 * @param {UsrRole | null | undefined} role
 * @returns {boolean}
 */
export function canManageGroupNodes(role) {
    return role === 'super_usr_role' || role === 'normal_usr_role'
}

/**
 * Global user administration affordances (list/create users). Backend protects
 * `POST /api/v1/usrs` for super users only; list endpoint is session-wide.
 *
 * @param {UsrRole | null | undefined} role
 * @returns {boolean}
 */
export function canManageUsrs(role) {
    return role === 'super_usr_role'
}
