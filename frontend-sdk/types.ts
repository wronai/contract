/**
 * Represents an aggregated system summary.
 */
export interface Summary {
    /**
     * Number of active users
     */
    active_users: number;
    /**
     * Generation timestamp (RFC3339)
     */
    generated_at: string;
    /**
     * Total number of users
     */
    total_users: number;
    [property: string]: any;
}

/**
 * Represents a user record.
 */
export interface User {
    /**
     * Optional age
     */
    age?: number | null;
    /**
     * Creation timestamp (RFC3339)
     */
    created_at: string;
    /**
     * User email address
     */
    email: string;
    /**
     * Unique identifier
     */
    id: string;
    /**
     * Display name
     */
    name: string;
    [property: string]: any;
}
