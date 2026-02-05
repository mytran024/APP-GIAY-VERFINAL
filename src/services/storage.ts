import { Vessel, Container, ResourceMember, WorkOrder, UserRole, SystemUser, ServicePrice, Consignee } from '../modules/logistics/types';
import { TallyReport, WorkOrder as InspectorWorkOrder } from '../modules/inspector/types';
import { SealData } from '../modules/paper/types';
import { Notification } from '../types';

// Storage Keys
const KEYS = {
    VESSELS: 'danalog_vessels',
    CONTAINERS: 'danalog_containers',
    RESOURCES: 'danalog_resources',
    TALLY_REPORTS: 'danalog_tally_reports',
    WORK_ORDERS: 'danalog_work_orders',
    INSPECTOR_WORK_ORDERS: 'danalog_inspector_work_orders',
    USERS: 'danalog_users',
    PRICES: 'danalog_prices',
    CONSIGNEES: 'danalog_consignees',
    CURRENT_USER: 'danalog_current_user',
    NOTIFICATIONS: 'danalog_notifications',
    SEALS: 'danalog_seals',
    EXPORT_VEHICLES: 'danalog_export_vehicles'
};

// Generic Storage Helper
const storage = {
    get: <T>(key: string, defaultValue: T): T => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Error reading ${key} from localStorage`, e);
            return defaultValue;
        }
    },
    set: <T>(key: string, value: T): void => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            window.dispatchEvent(new CustomEvent('storage-update', { detail: { key, value } }));
        } catch (e) {
            console.error(`Error writing ${key} to localStorage`, e);
        }
    }
};

// Specialized Data Access Objects
export const StorageService = {
    // Vessels
    getVessels: (defaultVessels: Vessel[] = []): Vessel[] => storage.get(KEYS.VESSELS, defaultVessels),
    saveVessels: (vessels: Vessel[]) => storage.set(KEYS.VESSELS, vessels),

    // Containers
    getContainers: (defaultContainers: Container[] = []): Container[] => storage.get(KEYS.CONTAINERS, defaultContainers),
    saveContainers: (containers: Container[]) => storage.set(KEYS.CONTAINERS, containers),

    // Resources (Workers/Mechanical)
    getResources: (defaultResources: ResourceMember[] = []): ResourceMember[] => storage.get(KEYS.RESOURCES, defaultResources),
    saveResources: (resources: ResourceMember[]) => storage.set(KEYS.RESOURCES, resources),

    // Tally Reports
    getTallyReports: (defaultReports: TallyReport[] = []): TallyReport[] => storage.get(KEYS.TALLY_REPORTS, defaultReports),
    saveTallyReports: (reports: TallyReport[]) => storage.set(KEYS.TALLY_REPORTS, reports),

    // Work Orders (Logistics)
    getWorkOrders: (defaultWOs: WorkOrder[] = []): WorkOrder[] => storage.get(KEYS.WORK_ORDERS, defaultWOs),
    saveWorkOrders: (workOrders: WorkOrder[]) => storage.set(KEYS.WORK_ORDERS, workOrders),

    // Work Orders (Inspector)
    getInspectorWorkOrders: (defaultWOs: InspectorWorkOrder[] = []): InspectorWorkOrder[] => storage.get(KEYS.INSPECTOR_WORK_ORDERS, defaultWOs),
    saveInspectorWorkOrders: (workOrders: InspectorWorkOrder[]) => storage.set(KEYS.INSPECTOR_WORK_ORDERS, workOrders),

    // Users
    getUsers: (defaultUsers: SystemUser[] = []): SystemUser[] => storage.get(KEYS.USERS, defaultUsers),
    saveUsers: (users: SystemUser[]) => storage.set(KEYS.USERS, users),

    // Prices (System-wide Configuration)
    getPrices: (defaultPrices: ServicePrice[] = []): ServicePrice[] => storage.get(KEYS.PRICES, defaultPrices),
    savePrices: (prices: ServicePrice[]) => storage.set(KEYS.PRICES, prices),

    // Consignees
    getConsignees: (defaultConsignees: any[] = []): any[] => storage.get(KEYS.CONSIGNEES, defaultConsignees),
    saveConsignees: (consignees: any[]) => storage.set(KEYS.CONSIGNEES, consignees),

    // Seals (Customs - Export)
    getSeals: (defaultSeals: SealData[] = []): SealData[] => storage.get(KEYS.SEALS, defaultSeals),
    saveSeals: (seals: SealData[]) => storage.set(KEYS.SEALS, seals),

    // Transport Vehicles (Export)
    getExportVehicles: (defaultVehicles: any[] = []): any[] => storage.get(KEYS.EXPORT_VEHICLES, defaultVehicles),
    saveExportVehicles: (vehicles: any[]) => storage.set(KEYS.EXPORT_VEHICLES, vehicles),

    // Notifications
    getNotifications: (): Notification[] => storage.get(KEYS.NOTIFICATIONS, []),
    saveNotifications: (notifications: Notification[]) => storage.set(KEYS.NOTIFICATIONS, notifications),
    addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
        const notifications = storage.get<Notification[]>(KEYS.NOTIFICATIONS, []);
        const newNotification: Notification = {
            ...notif,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            isRead: false
        };
        storage.set(KEYS.NOTIFICATIONS, [newNotification, ...notifications]);
    },

    // Session Persistence
    getCurrentUser: (): SystemUser | null => storage.get(KEYS.CURRENT_USER, null),
    saveCurrentUser: (user: SystemUser | null) => storage.set(KEYS.CURRENT_USER, user),

    // Clear all data (for testing/reset)
    clearAll: () => {
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    }
};
