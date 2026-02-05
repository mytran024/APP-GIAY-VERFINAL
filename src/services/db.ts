import { supabase } from '../lib/supabase';
import { Vessel, Container, ContainerStatus, UnitType, BusinessType, ResourceMember, SystemUser, WorkOrder, ServicePrice, Consignee } from '../modules/logistics/types';
import { TallyReport } from '../modules/inspector/types';
import { SealData } from '../modules/paper/types';

/**
 * DATABASE SERVICE (SUPABASE ADAPTER)
 * Replaces StorageService for Data Persistence
 * 
 * STRATEGY: 
 * 1. Alias columns in SELECT to match CamelCase Types
 * 2. Map CamelCase payload to SnakeCase for INSERT/UPDATE
 */

export const db = {
    // --- VESSELS ---
    getVessels: async (): Promise<Vessel[]> => {
        const { data, error } = await supabase
            .from('vessels')
            .select(`
        id,
        vesselName:name,
        commodity,
        consignee,
        totalContainers:total_containers,
        totalPkgs:total_pkgs,
        totalWeight:total_weight,
        eta,
        etd,
        debitStatus:debit_status,
        voyageNo:voyage_no,
        exportPlanActive:export_plan_active,
        exportArrivalTime:export_arrival_time,
        exportOperationTime:export_operation_time,
        exportPlannedWeight:export_planned_weight,
        customerName:customer_name,
        isBlocked:is_blocked,
        blockReason:block_reason
      `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching vessels:", error);
            return [];
        }
        return data as any as Vessel[];
    },

    upsertVessel: async (vessel: Vessel): Promise<Vessel | null> => {
        // Map CamelCase -> SnakeCase
        const payload = {
            id: vessel.id,
            name: vessel.vesselName,
            commodity: vessel.commodity,
            consignee: vessel.consignee,
            total_containers: vessel.totalContainers,
            total_pkgs: vessel.totalPkgs,
            total_weight: vessel.totalWeight,
            eta: vessel.eta || null,
            etd: vessel.etd || null,
            debit_status: vessel.debitStatus,
            voyage_no: vessel.voyageNo,
            export_plan_active: vessel.exportPlanActive,
            export_arrival_time: vessel.exportArrivalTime || null,
            export_operation_time: vessel.exportOperationTime || null,
            export_planned_weight: vessel.exportPlannedWeight,
            customer_name: (vessel as any).customerName, // Cast for intersection types
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('vessels')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.error("Error saving vessel:", error);
            return null;
        }
        return data as any;
    },

    deleteVessel: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('vessels').delete().eq('id', id);
        if (error) {
            console.error("Error deleting vessel:", error);
            return false;
        }
        return true;
    },

    // --- CONTAINERS ---
    getContainers: async (vesselId?: string): Promise<Container[]> => {
        let query = supabase.from('containers').select(`
      id,
      vesselId:vessel_id,
      unitType:unit_type,
      containerNo:container_no,
      size,
      sealNo:seal_no,
      carrier,
      pkgs,
      weight,
      customsPkgs:customs_pkgs,
      customsWeight:customs_weight,
      billNo:bill_no,
      vendor,
      detExpiry:det_expiry,
      tkNhaVC:transport_decl_no,
      ngayTkNhaVC:transport_decl_date,
      tkDnlOla:dnl_decl_no,
      ngayTkDnl:dnl_decl_date,
      ngayKeHoach:planning_date,
      ngayNhapKho:actual_import_date,
      noiHaRong:empty_return_location,
      status,
      tallyApproved:tally_approved,
      workOrderApproved:work_order_approved,
      remarks,
      workerNames:worker_names,
      lastUrgedAt:last_urged_at,
      images,
      shift,
      inspector
    `);

        if (vesselId) {
            query = query.eq('vessel_id', vesselId);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching containers:", error);
            return [];
        }
        return data as any as Container[];
    },

    upsertContainer: async (c: Container): Promise<Container | null> => {
        const payload = {
            id: c.id,
            vessel_id: c.vesselId,
            unit_type: c.unitType || 'CONTAINER',
            container_no: c.containerNo,
            size: c.size,
            seal_no: c.sealNo,
            carrier: c.carrier,
            pkgs: c.pkgs,
            weight: c.weight,
            customs_pkgs: c.customsPkgs,
            customs_weight: c.customsWeight,
            bill_no: c.billNo,
            vendor: c.vendor,
            det_expiry: c.detExpiry || null,
            transport_decl_no: c.tkNhaVC,
            transport_decl_date: c.ngayTkNhaVC || null,
            dnl_decl_no: c.tkDnlOla,
            dnl_decl_date: c.ngayTkDnl || null,
            planning_date: c.ngayKeHoach || null,
            actual_import_date: c.ngayNhapKho || null,
            empty_return_location: c.noiHaRong,
            status: c.status,
            tally_approved: c.tallyApproved,
            work_order_approved: c.workOrderApproved,
            remarks: c.remarks,
            worker_names: c.workerNames || [],
            images: c.images || [],
            shift: c.shift,
            inspector: c.inspector,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('containers').upsert(payload).select().single();
        if (error) {
            console.error("Error saving container:", error);
            return null;
        }
        return data as any;
    },

    deleteContainer: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('containers').delete().eq('id', id);
        return !error;
    },

    // --- TALLY REPORTS ---
    getTallyReports: async (): Promise<TallyReport[]> => {
        // Requires joining with tally_items to reconstruct the full report object
        const { data, error } = await supabase
            .from('tally_reports')
            .select(`
        id,
        vesselId:vessel_id,
        mode,
        shift,
        workDate:work_date,
        owner,
        workerCount:worker_count,
        workerNames:worker_names,
        mechanicalCount:mechanical_count,
        mechanicalNames:mechanical_names,
        externalMechanicalCount:external_mechanical_count,
        mechanicalDetails:mechanical_details,
        equipment,
        vehicleNo:vehicle_no,
        vehicleType:vehicle_type,
        vehicleCategory:vehicle_category,
        status,
        createdBy:created_by,
        createdAt:created_at,
        tally_items (
          id, cont_id, cont_no, size, commodity_type, seal_no, actual_units, actual_weight,
          is_scratched_floor, torn_units, notes, transport_vehicle, seal_count, photos
        )
      `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching tally reports:", error);
            return [];
        }

        // Transform nested items back to CamelCase
        return data.map((r: any) => ({
            ...r,
            items: r.tally_items.map((i: any) => ({
                contId: i.cont_id,
                contNo: i.cont_no,
                size: i.size,
                commodityType: i.commodity_type,
                sealNo: i.seal_no,
                actualUnits: i.actual_units,
                actualWeight: i.actual_weight,
                isScratchedFloor: i.is_scratched_floor,
                tornUnits: i.torn_units,
                notes: i.notes,
                transportVehicle: i.transport_vehicle,
                sealCount: i.seal_count,
                photos: i.photos || []
            }))
        })) as TallyReport[];
    },

    upsertTallyReport: async (report: TallyReport): Promise<boolean> => {
        // 1. Upsert Report
        const reportPayload = {
            id: report.id,
            vessel_id: report.vesselId,
            mode: report.mode,
            shift: report.shift,
            work_date: report.workDate || null,
            owner: report.owner,
            worker_count: report.workerCount,
            worker_names: report.workerNames,
            mechanical_count: report.mechanicalCount,
            mechanical_names: report.mechanicalNames,
            mechanical_details: report.mechanicalDetails,
            equipment: report.equipment,
            vehicle_no: report.vehicleNo,
            vehicle_type: report.vehicleType,
            vehicle_category: report.vehicleCategory,
            status: report.status,
            created_by: report.createdBy
        };

        const { error: rError } = await supabase.from('tally_reports').upsert(reportPayload);
        if (rError) {
            console.error("Error saving Tally Report:", rError);
            return false;
        }

        // 2. Upsert Items (Delete existing for this report to handle updates cleanly?)
        // Strategy: Delete all items for this report first, then re-insert. Safer for simple logic.
        await supabase.from('tally_items').delete().eq('report_id', report.id);

        if (report.items && report.items.length > 0) {
            const itemsPayload = report.items.map(i => ({
                report_id: report.id,
                cont_id: i.contId,
                cont_no: i.contNo,
                commodity_type: i.commodityType,
                seal_no: i.sealNo,
                actual_units: i.actualUnits,
                actual_weight: i.actualWeight,
                is_scratched_floor: i.isScratchedFloor,
                torn_units: i.tornUnits,
                notes: i.notes,
                transport_vehicle: i.transportVehicle,
                photos: i.photos
            }));
            const { error: iError } = await supabase.from('tally_items').insert(itemsPayload);
            if (iError) console.error("Error saving items:", iError);
        }

        return true;
    },

    // --- WORK ORDERS ---
    getWorkOrders: async (): Promise<WorkOrder[]> => {
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
        id,
        reportId:report_id,
        vesselId:vessel_id,
        type,
        businessType:business_type,
        status,
        teamName:team_name,
        workerNames:worker_names,
        peopleCount:people_count,
        vehicleNos:vehicle_nos,
        vehicleType:vehicle_type,
        containerIds:container_ids,
        containerNos:container_nos,
        shift,
        date,
        items,
        isHoliday:is_holiday,
        isWeekend:is_weekend,
        isOutsourced:is_outsourced
      `);

        if (error) return [];

        // items is already JSONB, so it maps directly
        return data as any as WorkOrder[];
    }
};
