import { supabase } from '../lib/supabase';
import { Vessel, Container, ContainerStatus, UnitType, BusinessType, ResourceMember, SystemUser, WorkOrder, ServicePrice, Consignee } from '../modules/logistics/types';
import { TallyReport } from '../modules/inspector/types';
import { SealData, Vehicle } from '../modules/paper/types';

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

    upsertVessel: async (vessel: Vessel): Promise<{ data: Vessel | null, error: any }> => {
        // Only include id if it's a valid UUID (for updates)
        const isUpdate = db._isValidUUID(vessel.id);

        const payload: any = {
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
            customer_name: (vessel as any).customerName,
        };

        if (isUpdate) payload.id = vessel.id;

        const { data, error } = await supabase
            .from('vessels')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.error("Error saving vessel:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
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
      actualPkgs:actual_pkgs,
      actualWeight:actual_weight,
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
      inspector,
      updatedAt:updated_at
    `)
            .order('updated_at', { ascending: false })
            .limit(1000); // Limit to last 1000 containers for stability

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

    upsertContainer: async (c: Container): Promise<{ data: Container | null, error: any }> => {
        const isUpdate = db._isValidUUID(c.id);

        const payload: any = {
            vessel_id: c.vesselId,
            unit_type: c.unitType || 'CONTAINER',
            container_no: c.containerNo,
            size: c.size,
            seal_no: c.sealNo,
            carrier: c.carrier,
            pkgs: c.pkgs,
            weight: c.weight,
            actual_pkgs: c.actualPkgs,
            actual_weight: c.actualWeight,
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
        };

        if (isUpdate) payload.id = c.id;

        const { data, error } = await supabase.from('containers').upsert(payload).select().single();
        if (error) {
            console.error("Error saving container:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
    },

    upsertContainers: async (containers: Container[]): Promise<{ count: number, error: any }> => {
        if (!containers.length) return { count: 0, error: null };

        const CHUNK_SIZE = 25; // Reduced to prevent timeouts
        let totalCount = 0;

        for (let i = 0; i < containers.length; i += CHUNK_SIZE) {
            const chunk = containers.slice(i, i + CHUNK_SIZE);
            const payloads = chunk.map(c => {
                const isUpdate = db._isValidUUID(c.id);
                const payload: any = {
                    vessel_id: c.vesselId,
                    unit_type: c.unitType || 'CONTAINER',
                    container_no: c.containerNo,
                    size: c.size,
                    seal_no: c.sealNo,
                    carrier: c.carrier,
                    pkgs: c.pkgs,
                    weight: c.weight,
                    actual_pkgs: c.actualPkgs,
                    actual_weight: c.actualWeight,
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
                };
                if (isUpdate) payload.id = c.id;
                return payload;
            });

            const { error } = await supabase.from('containers').upsert(payloads);
            if (error) {
                console.error("Error saving batch containers chunk:", error);
                return { count: totalCount, error };
            }
            totalCount += chunk.length;

            // Add delay between chunks to prevent rate limiting
            if (i + CHUNK_SIZE < containers.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        return { count: totalCount, error: null };
    },

    deleteContainer: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('containers').delete().eq('id', id);
        return !error;
    },

    // --- TALLY REPORTS ---
    getTallyReports: async (): Promise<TallyReport[]> => {
        const { data, error } = await supabase
            .from('tally_reports')
            .select(`
        id,
        vesselId:vessel_id,
        vessels(name),
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
        proofImageUrl:proof_image_url,
        tally_items (
          cont_id,
          cont_no,
          size,
          commodity_type,
          seal_no,
          actual_units,
          actual_weight,
          is_scratched_floor, 
          torn_units, 
          notes,
          photos, 
          transport_vehicle, 
          seal_count
        )
      `)
            .order('created_at', { ascending: false })
            .limit(100); // Limit to last 100 reports for performance

        if (error) {
            console.error("Error fetching tally reports:", JSON.stringify(error, null, 2));
            return [];
        }

        try {
            return data.map((r: any) => {
                // Reconstruct the report with joined data if available
                const vesselName = r.vessels?.name || "";
                const creatorName = r.createdBy || "Kiểm viên";

                return {
                    ...r,
                    vesselName,
                    creatorName,
                    items: (r.tally_items || []).map((i: any) => ({
                        contId: i.cont_id,
                        contNo: i.cont_no,
                        size: i.size,
                        commodityType: i.commodity_type,
                        sealNo: i.seal_no,
                        actualUnits: i.actual_units,
                        actualWeight: i.actual_weight,
                        isScratchedFloor: i.is_scratched_floor,
                        tornUnits: i.torn_units,
                        notes: i.notes || '',
                        transportVehicle: i.transport_vehicle || '',
                        sealCount: i.seal_count || 0,
                        photos: i.photos || []
                    }))
                };
            }) as TallyReport[];
        } catch (mapError) {
            console.error("Error mapping tally reports:", mapError);
            return [];
        }
    },

    // Helper: Check if string is valid UUID
    _isValidUUID: (id: string): boolean => {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    },

    // Helper: Convert any string to a stable UUID
    _toUUID: (str: string): string => {
        if (db._isValidUUID(str)) return str;

        // Simple hashing to generate a deterministic UUID-like string
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        const absHash = Math.abs(hash).toString(16).padStart(8, '0');
        // We use a fixed namespace prefix and the hash to make it look like a UUID
        // This is not a perfect UUID v5 but sufficient for internal stable mapping
        return `00000000-0000-4000-8000-${absHash.repeat(2).substring(0, 12)}`;
    },

    upsertTallyReport: async (report: TallyReport): Promise<{ success: boolean, id?: string, error?: any }> => {
        const reportId = db._toUUID(report.id || `TALLY-${Date.now()}`);

        const reportPayload: any = {
            vessel_id: report.vesselId,
            mode: report.mode,
            shift: report.shift,
            work_date: report.workDate || null,
            owner: report.owner,
            worker_count: report.workerCount,
            worker_names: report.workerNames,
            mechanical_count: report.mechanicalCount,
            mechanical_names: report.mechanicalNames,
            external_mechanical_count: report.externalMechanicalCount || 0,
            mechanical_details: report.mechanicalDetails || null,
            equipment: report.equipment,
            vehicle_no: report.vehicleNo,
            vehicle_type: report.vehicleType,
            vehicle_category: report.vehicleCategory,
            status: report.status,
            created_by: report.createdBy,
            proof_image_url: report.proofImageUrl
        };

        reportPayload.id = reportId;

        const { data: savedReport, error: rError } = await supabase
            .from('tally_reports')
            .upsert(reportPayload)
            .select('id')
            .single();

        if (rError) {
            console.error("Error saving Tally Report:", rError);
            return { success: false, error: rError };
        }

        // reportId is already determined above

        // Delete existing items for this report
        await supabase.from('tally_items').delete().eq('report_id', reportId);

        if (report.items && report.items.length > 0) {
            const itemsPayload = report.items.map(i => ({
                report_id: reportId,
                cont_id: i.contId,
                cont_no: i.contNo,
                size: i.size,
                commodity_type: i.commodityType,
                seal_no: i.sealNo,
                seal_count: i.sealCount || 0,
                actual_units: i.actualUnits,
                actual_weight: i.actualWeight,
                is_scratched_floor: i.isScratchedFloor,
                torn_units: i.tornUnits,
                notes: i.notes || '',
                transport_vehicle: i.transportVehicle || '',
                photos: i.photos || []
            }));
            const { error: iError } = await supabase.from('tally_items').insert(itemsPayload);
            if (iError) {
                console.error("Error saving items:", iError);
                return { success: false, error: iError };
            }
        }

        return { success: true, id: reportId };
    },

    upsertTallyReports: async (reports: TallyReport[]): Promise<{ success: boolean, ids?: string[], error?: any }> => {
        if (!reports || reports.length === 0) return { success: true, ids: [] };

        // 1. Prepare Report Payloads
        const reportPayloads = reports.map((report, idx) => {
            const reportId = db._toUUID(report.id || `TALLY-BATCH-${idx}-${Date.now()}`);
            const payload: any = {
                id: reportId,
                vessel_id: report.vesselId,
                mode: report.mode,
                shift: report.shift,
                work_date: report.workDate || null,
                owner: report.owner,
                worker_count: report.workerCount,
                worker_names: report.workerNames,
                mechanical_count: report.mechanicalCount,
                mechanical_names: report.mechanicalNames,
                external_mechanical_count: report.externalMechanicalCount || 0,
                mechanical_details: report.mechanicalDetails || null,
                equipment: report.equipment,
                vehicle_no: report.vehicleNo,
                vehicle_type: report.vehicleType,
                vehicle_category: report.vehicleCategory,
                status: report.status,
                created_by: report.createdBy,
                proof_image_url: report.proofImageUrl
            };
            return payload;
        });

        // 2. Batch Upsert Reports
        const { data: savedReports, error: rError } = await supabase
            .from('tally_reports')
            .upsert(reportPayloads)
            .select('id');

        if (rError) {
            console.error("Error batch saving Tally Reports:", rError);
            return { success: false, error: rError };
        }

        const reportIds = savedReports.map(r => r.id);

        // 3. Prepare Item Payloads
        const allItemsPayload: any[] = [];
        reports.forEach((report, idx) => {
            const dbReportId = reportIds[idx];
            if (report.items && report.items.length > 0) {
                report.items.forEach(i => {
                    allItemsPayload.push({
                        report_id: dbReportId,
                        cont_id: i.contId,
                        cont_no: i.contNo,
                        size: i.size,
                        commodity_type: i.commodityType,
                        seal_no: i.sealNo,
                        seal_count: i.sealCount || 0,
                        actual_units: i.actualUnits,
                        actual_weight: i.actualWeight,
                        is_scratched_floor: i.isScratchedFloor,
                        torn_units: i.tornUnits,
                        notes: i.notes || '',
                        transport_vehicle: i.transportVehicle || '',
                        photos: i.photos || []
                    });
                });
            }
        });

        // 4. Clean up old items & Batch Insert New Items
        if (allItemsPayload.length > 0) {
            // Delete existing items for these specific reports
            await supabase.from('tally_items').delete().in('report_id', reportIds);

            // Insert in chunks to avoid size limits
            const CHUNK_SIZE = 50;
            for (let i = 0; i < allItemsPayload.length; i += CHUNK_SIZE) {
                const chunk = allItemsPayload.slice(i, i + CHUNK_SIZE);
                const { error: iError } = await supabase.from('tally_items').insert(chunk);
                if (iError) {
                    console.error("Error batch saving items:", iError);
                    return { success: false, error: iError };
                }
            }
        }

        return { success: true, ids: reportIds };
    },


    // --- WORK ORDERS ---
    getWorkOrders: async (): Promise<WorkOrder[]> => {
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                id,
                reportId:report_id,
                vesselId:vessel_id,
                vessels(name),
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
                handlingMethod:handling_method,
                commodityType:commodity_type,
                specification:specification,
                quantity,
                weight,
                dayLaborerCount:day_laborer_count,
                note,
                isHoliday:is_holiday,
                isWeekend:is_weekend,
                isOutsourced:is_outsourced
            `)
            .order('created_at', { ascending: false })
            .limit(150); // Limit to last 150 work orders for performance

        if (error) return [];

        return data.map((wo: any) => ({
            ...wo,
            vesselName: wo.vessels?.name || ""
        })) as any as WorkOrder[];
    },

    upsertWorkOrder: async (wo: WorkOrder): Promise<{ data: WorkOrder | null, error: any }> => {
        const woId = db._toUUID(wo.id || `WO-${Date.now()}`);
        const hasValidReportId = db._isValidUUID(wo.reportId || '');

        const payload: any = {
            vessel_id: wo.vesselId,
            type: wo.type,
            business_type: wo.businessType,
            status: wo.status,
            team_name: wo.teamName || (wo as any).organization,
            worker_names: wo.workerNames,
            people_count: wo.peopleCount || 0,
            vehicle_nos: wo.vehicleNos,
            vehicle_type: wo.vehicleType,
            container_ids: wo.containerIds,
            container_nos: wo.containerNos,
            shift: wo.shift,
            date: wo.date || null,
            items: wo.items,
            handling_method: wo.handlingMethod,
            commodity_type: wo.commodityType,
            specification: wo.specification,
            quantity: wo.quantity,
            weight: wo.weight,
            day_laborer_count: wo.dayLaborerCount,
            note: wo.note,
            is_holiday: wo.isHoliday,
            is_weekend: wo.isWeekend,
            is_outsourced: wo.isOutsourced
        };

        payload.id = woId;
        if (hasValidReportId) payload.report_id = wo.reportId;

        const { data, error } = await supabase.from('work_orders').upsert(payload).select().single();
        if (error) {
            console.error("Error saving WorkOrder:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
    },

    upsertWorkOrders: async (wos: WorkOrder[]): Promise<{ success: boolean, error?: any }> => {
        if (!wos || wos.length === 0) return { success: true };

        const payloads = wos.map((wo, idx) => {
            const woId = db._toUUID(wo.id || `WO-BATCH-${idx}-${Date.now()}`);
            const hasValidReportId = db._isValidUUID(wo.reportId || '');

            const payload: any = {
                id: woId,
                vessel_id: wo.vesselId,
                type: wo.type,
                business_type: wo.businessType,
                status: wo.status,
                team_name: wo.teamName || (wo as any).organization,
                worker_names: wo.workerNames,
                people_count: wo.peopleCount || 0,
                vehicle_nos: wo.vehicleNos,
                vehicle_type: wo.vehicleType,
                container_ids: wo.containerIds,
                container_nos: wo.containerNos,
                shift: wo.shift,
                date: wo.date || null,
                items: wo.items,
                handling_method: wo.handlingMethod,
                commodity_type: wo.commodityType,
                specification: wo.specification,
                quantity: wo.quantity,
                weight: wo.weight,
                day_laborer_count: wo.dayLaborerCount,
                note: wo.note,
                is_holiday: wo.isHoliday,
                is_weekend: wo.isWeekend,
                is_outsourced: wo.isOutsourced
            };

            if (hasValidReportId) payload.report_id = wo.reportId;
            return payload;
        });

        const { error } = await supabase.from('work_orders').upsert(payloads);
        if (error) {
            console.error("Error batch saving Work Orders:", error);
            return { success: false, error };
        }
        return { success: true };
    },


    deleteWorkOrder: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('work_orders').delete().eq('id', id);
        return !error;
    },

    // --- TRANSPORT VEHICLES ---
    getTransportVehicles: async (): Promise<Vehicle[]> => {
        const { data, error } = await supabase
            .from('transport_vehicles')
            .select(`
                id,
                vesselId:vessel_id,
                plateNumber:plate_number,
                trailerNumber:trailer_number,
                driverName:driver_name,
                tripsCompleted:trips_completed,
                status
            `);

        if (error) {
            console.error("Error fetching vehicles:", error);
            return [];
        }
        return data as any as Vehicle[];
    },

    upsertTransportVehicle: async (vehicle: Vehicle): Promise<{ data: Vehicle | null, error: any }> => {
        const isUpdate = db._isValidUUID(vehicle.id);
        const payload: any = {
            vessel_id: vehicle.vesselId,
            plate_number: vehicle.plateNumber,
            trailer_number: vehicle.trailerNumber,
            driver_name: vehicle.driverName,
            trips_completed: vehicle.tripsCompleted || 0,
            status: vehicle.status || 'ACTIVE',
        };

        if (isUpdate) payload.id = vehicle.id;

        const { data, error } = await supabase.from('transport_vehicles').upsert(payload).select().single();
        if (error) {
            console.error("Error saving vehicle:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
    },

    deleteTransportVehicle: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('transport_vehicles').delete().eq('id', id);
        return !error;
    },

    // --- SEALS ---
    getSeals: async (): Promise<SealData[]> => {
        const { data, error } = await supabase
            .from('export_seals')
            .select(`
                id,
                vesselId:vessel_id,
                serialNumber:serial_number,
                status
            `);

        if (error) {
            console.error("Error fetching seals:", error);
            return [];
        }
        return data as any as SealData[];
    },

    upsertSeals: async (seals: SealData[]): Promise<{ count: number, error: any }> => {
        if (!seals.length) return { count: 0, error: null };

        const CHUNK_SIZE = 25;
        let totalCount = 0;

        for (let i = 0; i < seals.length; i += CHUNK_SIZE) {
            const chunk = seals.slice(i, i + CHUNK_SIZE);
            const payloads = chunk.map(s => {
                const isUpdate = db._isValidUUID(s.id);
                const payload: any = {
                    vessel_id: s.vesselId,
                    serial_number: s.serialNumber,
                    status: s.status,
                };
                if (isUpdate) payload.id = s.id;
                return payload;
            });

            const { error } = await supabase.from('export_seals').upsert(payloads);
            if (error) {
                console.error("Error saving batch seals chunk:", error);
                return { count: totalCount, error };
            }
            totalCount += chunk.length;

            // Add delay between chunks to prevent rate limiting
            if (i + CHUNK_SIZE < seals.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        return { count: totalCount, error: null };
    },

    deleteSeal: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('export_seals').delete().eq('id', id);
        return !error;
    },

    // --- SERVICE PRICES ---
    getServicePrices: async (): Promise<ServicePrice[]> => {
        const { data, error } = await supabase
            .from('service_prices')
            .select(`
                id,
                name,
                unit,
                price,
                category,
                group,
                businessType:business_type,
                subGroup:sub_group
            `)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching prices:", error);
            return [];
        }
        return data as any as ServicePrice[];
    },

    upsertServicePrice: async (p: ServicePrice): Promise<{ data: ServicePrice | null, error: any }> => {
        const isUpdate = db._isValidUUID(p.id);
        const payload: any = {
            name: p.name,
            unit: p.unit,
            price: p.price,
            category: p.category,
            group: p.group,
            business_type: p.businessType,
            sub_group: p.subGroup,
        };

        if (isUpdate) payload.id = p.id;

        const { data, error } = await supabase.from('service_prices').upsert(payload).select().single();
        if (error) {
            console.error("Error saving price:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
    },

    deleteServicePrice: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('service_prices').delete().eq('id', id);
        return !error;
    },

    // --- CONSIGNEES ---
    getConsignees: async (): Promise<Consignee[]> => {
        const { data, error } = await supabase
            .from('consignees')
            .select(`
                id,
                name,
                taxCode:tax_code,
                address,
                phone,
                email
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching consignees:", error);
            return [];
        }
        return data as any as Consignee[];
    },

    upsertConsignee: async (c: Consignee): Promise<{ data: Consignee | null, error: any }> => {
        const isUpdate = db._isValidUUID(c.id);
        const payload: any = {
            name: c.name,
            tax_code: c.taxCode,
            address: c.address,
            phone: c.phone,
            email: c.email,
        };

        if (isUpdate) payload.id = c.id;

        const { data, error } = await supabase.from('consignees').upsert(payload).select().single();
        if (error) {
            console.error("Error saving consignee:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
    },

    deleteConsignee: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('consignees').delete().eq('id', id);
        return !error;
    },

    // --- SYSTEM USERS ---
    getSystemUsers: async (): Promise<SystemUser[]> => {
        const { data, error } = await supabase
            .from('system_users')
            .select(`
                id,
                username,
                password,
                name:fullname,
                role,
                phone,
                email,
                department,
                isActive:is_active,
                employeeId:employee_id
            `);

        if (error) {
            console.error("Error fetching users:", error);
            return [];
        }
        return data as any as SystemUser[];
    },

    upsertSystemUser: async (u: SystemUser): Promise<{ data: SystemUser | null, error: any }> => {
        const isUpdate = db._isValidUUID(u.id);
        const payload: any = {
            username: u.username,
            password: u.password,
            fullname: u.name,
            role: u.role,
            phone: u.phone,
            email: u.email,
            department: u.department,
            is_active: u.isActive ?? true,
            employee_id: u.employeeId
        };

        if (isUpdate) payload.id = u.id;

        const { data, error } = await supabase.from('system_users').upsert(payload).select().single();
        if (error) {
            console.error("Error saving user:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
    },

    deleteSystemUser: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('system_users').delete().eq('id', id);
        return !error;
    },

    // --- RESOURCE MEMBERS ---
    getResourceMembers: async (): Promise<ResourceMember[]> => {
        const { data, error } = await supabase
            .from('resource_members')
            .select(`
                id,
                name,
                phone,
                department,
                type,
                isOutsourced:is_outsourced,
                unitName:unit_name
            `);

        if (error) {
            console.error("Error fetching resources:", error);
            return [];
        }
        return data as any as ResourceMember[];
    },

    upsertResourceMember: async (r: ResourceMember): Promise<{ data: ResourceMember | null, error: any }> => {
        const isUpdate = db._isValidUUID(r.id);
        const payload: any = {
            name: r.name,
            phone: r.phone,
            department: r.department,
            type: r.type,
            is_outsourced: r.isOutsourced,
            unit_name: r.unitName,
        };

        if (isUpdate) payload.id = r.id;

        const { data, error } = await supabase.from('resource_members').upsert(payload).select().single();
        if (error) {
            console.error("Error saving resource:", error);
            return { data: null, error };
        }
        return { data: data as any, error: null };
    },

    deleteResourceMember: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('resource_members').delete().eq('id', id);
        return !error;
    },

    subscribeToTable: (tableName: string, callback: (payload: any) => void) => {
        console.log(`[REALTIME] Subscribing to ${tableName}`);
        return supabase
            .channel(`public:${tableName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
                console.log(`[REALTIME] Change in ${tableName}:`, payload);
                callback(payload);
            })
            .subscribe((status) => {
                console.log(`[REALTIME] Subscription status for ${tableName}:`, status);
            });
    }
};
