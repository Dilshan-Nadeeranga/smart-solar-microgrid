/**
 * Member 4 role rules for the web UI. The API enforces these again;
 * the UI only uses them to hide pages and buttons.
 */

/** Roles that can open the Bookings pages. */
export const BOOKINGS_ROLES = ['BACKOFFICE', 'GRID_OPERATOR']

/**
 * Roles that see Approve / Reject.
 * TODO: Confirm the approving role with the lecturer. The brief does not clearly
 * assign it. Keep in sync with ReservationPermissions.Approvers in the API.
 */
export const APPROVER_ROLES = ['BACKOFFICE', 'GRID_OPERATOR']

export const canApprove = (role) => APPROVER_ROLES.includes(role)
