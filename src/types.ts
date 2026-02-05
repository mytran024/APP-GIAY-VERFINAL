export enum Role {
    ADMIN = 'ADMIN', // Logistics Admin
    CS = 'CS', // Logistics CS
    INSPECTOR = 'INSPECTOR', // Field Inspector
    DEPOT = 'DEPOT', // Paper - Warehouse
    CUSTOMS = 'CUSTOMS', // Paper - Customs
    TRANSPORT = 'TRANSPORT', // Paper - Transport
}

export interface User {
    username: string;
    name: string;
    role: Role;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
    timestamp: string;
    isRead: boolean;
    targetRoles: Role[];
    metadata?: any;
}
