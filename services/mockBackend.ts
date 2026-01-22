
import { supabase } from './supabaseClient';
import { 
    User, ApiResponse, TimeLog, DayOffRequest, Report, Project, 
    TeardownJob, TeardownPart, TeardownCategory, TeardownParamDefinition,
    IncomingLaptop, RepairJob, AdvisorAnalysis, ErasureJob, DiskInfo,
    TaskTimer, CompanyHoliday, CRMContact
} from '../types';

const successResponse = <T>(data: T): ApiResponse<T> => ({ success: true, data });
const errorResponse = (error: any): ApiResponse<any> => ({ success: false, error: error.message || String(error) });

// --- HELPERS FOR MAPPING (CRITICAL FIXES) ---
const mapPartFromDB = (p: any): TeardownPart => ({
    ...p,
    // Support both casings from DB result
    jobId: p.job_id || p.jobId,
    categoryId: p.category_id || p.categoryId,
    baselinkerId: p.baselinker_id || p.baselinkerId,
    // Ensure images is always an array to prevent UI issues
    images: p.images || p.photos || [] 
});

const mapPartToDB = (p: Partial<TeardownPart>): any => {
    // Create a clean object with only DB-compatible fields
    const dbObj: any = { 
        category: p.category,
        name: p.name,
        manufacturer: p.manufacturer,
        sku: p.sku,
        parameters: p.parameters,
        images: p.images || []
    };
    
    // Map CamelCase to SnakeCase for DB (if values exist)
    if (p.jobId !== undefined) dbObj.job_id = p.jobId;
    else if ((p as any).job_id) dbObj.job_id = (p as any).job_id;

    if (p.categoryId !== undefined) dbObj.category_id = p.categoryId;
    else if ((p as any).category_id) dbObj.category_id = (p as any).category_id;

    if (p.baselinkerId !== undefined) dbObj.baselinker_id = p.baselinkerId;
    else if ((p as any).baselinker_id) dbObj.baselinker_id = (p as any).baselinker_id;
    
    // Explicitly check for ID only for updates
    if (p.id) dbObj.id = p.id;

    // CRITICAL: Remove undefined values, Supabase treats them as errors often leading to "PATCH blocked"
    Object.keys(dbObj).forEach(key => {
        if (dbObj[key] === undefined) delete dbObj[key];
    });
    
    return dbObj;
};

// Auth & User
export const getBrowserDeviceId = () => {
    let id = localStorage.getItem('sitrem_device_id');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sitrem_device_id', id);
    }
    return id;
};

export const apiGetUser = async (): Promise<ApiResponse<User>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) return successResponse(profile as User);
    
    return successResponse({
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role: 'user',
        avatarUrl: 'https://ui-avatars.com/api/?name=' + (user.email || 'User'),
        department: 'General'
    });
};

export const apiLogin = async () => { };

export const apiCredentialLogin = async (email: string, password: string): Promise<ApiResponse<User>> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return errorResponse(error);
    if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        return successResponse(profile as User);
    }
    return { success: false, error: "Login failed" };
};

export const apiLogout = async () => {
    await supabase.auth.signOut();
    return successResponse(undefined);
};

export const apiUpdateProfile = async (id: string, updates: any): Promise<ApiResponse<User>> => {
    if (updates.password) {
        const { error } = await supabase.auth.updateUser({ password: updates.password });
        if (error) return errorResponse(error);
    }
    const { data, error } = await supabase.from('profiles').update({
        avatarUrl: updates.avatarUrl,
    }).eq('id', id).select().single();
    return error ? errorResponse(error) : successResponse(data as User);
};

export const apiGetAllUsers = async (): Promise<ApiResponse<User[]>> => {
    const { data, error } = await supabase.from('profiles').select('*');
    return error ? errorResponse(error) : successResponse(data as User[]);
};

export const apiUpdateUser = async (user: User): Promise<ApiResponse<User>> => {
    const { data, error } = await supabase.from('profiles').update(user).eq('id', user.id).select().single();
    return error ? errorResponse(error) : successResponse(data as User);
};

export const apiAdminCreateUser = async (email: string, password: string, name: string, department: string) => {
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: { name, department, role: 'user' } } 
    });
    return error ? errorResponse(error) : successResponse(data);
};

// Logs
export const apiGetLogs = async (userId: string): Promise<ApiResponse<TimeLog[]>> => {
    const { data, error } = await supabase.from('time_logs').select('*').eq('userId', userId).order('checkIn', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as TimeLog[]);
};

export const apiGetAllLogs = async (): Promise<ApiResponse<TimeLog[]>> => {
    const { data, error } = await supabase.from('time_logs').select('*').order('checkIn', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as TimeLog[]);
};

export const apiAdminManualCheckOut = async (logId: string, checkOutTime: string) => {
    const { error } = await supabase.from('time_logs').update({ checkOut: checkOutTime, status: 'completed' }).eq('id', logId);
    return error ? errorResponse(error) : successResponse(undefined);
};

// Requests
export const apiGetDayOffRequests = async (userId?: string): Promise<ApiResponse<DayOffRequest[]>> => {
    let query = supabase.from('day_off_requests').select('*').order('date', { ascending: false });
    if (userId) query = query.eq('userId', userId);
    const { data, error } = await query;
    return error ? errorResponse(error) : successResponse(data as DayOffRequest[]);
};

export const apiSubmitDayOffRequest = async (userId: string, date: string, reason: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase.from('day_off_requests').insert({ userId, date, reason, status: 'pending' });
    return error ? errorResponse(error) : successResponse(undefined);
};

export const apiUpdateDayOffRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('day_off_requests').update({ status }).eq('id', id);
    return error ? errorResponse(error) : successResponse(undefined);
};

// Terminal
export const apiGenerateTerminalToken = async (): Promise<ApiResponse<string>> => {
    return successResponse("TERM-" + Math.floor(Date.now() / 30000));
};

export const apiProcessAttendanceScan = async (userId: string, token: string): Promise<ApiResponse<{message: string}>> => {
    const now = new Date().toISOString();
    const { data: activeLog } = await supabase.from('time_logs').select('*').eq('userId', userId).eq('status', 'active').single();
    
    if (activeLog) {
        await supabase.from('time_logs').update({ checkOut: now, status: 'completed' }).eq('id', activeLog.id);
        return successResponse({ message: "Goodbye!" });
    } else {
        await supabase.from('time_logs').insert({ userId, checkIn: now, status: 'active', method: 'qr_scan' });
        return successResponse({ message: "Welcome!" });
    }
};

// Reports
export const apiGetProjects = async (): Promise<ApiResponse<Project[]>> => {
    const { data, error } = await supabase.from('projects').select('*');
    return error ? errorResponse(error) : successResponse(data as Project[]);
};

export const apiSubmitReport = async (report: Partial<Report>): Promise<ApiResponse<void>> => {
    const { error } = await supabase.from('reports').insert(report);
    return error ? errorResponse(error) : successResponse(undefined);
};

export const apiGetUserReports = async (userId: string): Promise<ApiResponse<Report[]>> => {
    const { data, error } = await supabase.from('reports').select('*').eq('userId', userId).order('date', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as Report[]);
};

export const apiGetReports = async (): Promise<ApiResponse<(Report & { user: User })[]>> => {
    const { data, error } = await supabase.from('reports').select('*, user:profiles(*)').order('date', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as any);
};

// Company
export const apiGetCompanyHolidays = async (): Promise<ApiResponse<CompanyHoliday[]>> => {
    const { data, error } = await supabase.from('company_holidays').select('*');
    return error ? errorResponse(error) : successResponse(data as CompanyHoliday[]);
};

export const apiAddCompanyHoliday = async (date: string, name: string) => {
    const { error } = await supabase.from('company_holidays').insert({ date, name });
    return error ? errorResponse(error) : successResponse(undefined);
};

export const apiDeleteCompanyHoliday = async (id: string) => {
    const { error } = await supabase.from('company_holidays').delete().eq('id', id);
    return error ? errorResponse(error) : successResponse(undefined);
};

// Uploads
export const apiUploadVideo = async (userId: string, blob: Blob, filename: string): Promise<ApiResponse<string>> => {
    const path = `videos/${userId}/${filename}`;
    const { data, error } = await supabase.storage.from('laptop-photos').upload(path, blob);
    if (error) return errorResponse(error);
    const { data: { publicUrl } } = supabase.storage.from('laptop-photos').getPublicUrl(path);
    return successResponse(publicUrl);
};

// Data Wiping
export const apiGetErasureJobs = async (): Promise<ApiResponse<ErasureJob[]>> => {
    const { data, error } = await supabase.from('erasure_jobs').select('*').order('createdAt', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as ErasureJob[]);
};

export const apiCreateErasureJob = async (clientName: string): Promise<ApiResponse<ErasureJob>> => {
    const { data, error } = await supabase.from('erasure_jobs').insert({ clientName, status: 'pending' }).select().single();
    return error ? errorResponse(error) : successResponse(data as ErasureJob);
};

export const apiGetDisksForJob = async (jobId: string): Promise<ApiResponse<DiskInfo[]>> => {
    const { data, error } = await supabase.from('erasure_disks').select('*').eq('jobId', jobId);
    return error ? errorResponse(error) : successResponse(data as DiskInfo[]);
};

export const apiParseKillDiskReport = async (jobId: string, xmlContent: string): Promise<ApiResponse<DiskInfo[]>> => {
    const mockDisks: DiskInfo[] = [
        { id: 'd1', jobId, model: 'Samsung SSD 860', serialNumber: 'S4XANB0K', capacity: '500GB', wipingStatus: 'success' },
        { id: 'd2', jobId, model: 'WD Blue', serialNumber: 'WCC6Y', capacity: '1TB', wipingStatus: 'failed' }
    ];
    await supabase.from('erasure_disks').insert(mockDisks);
    return successResponse(mockDisks);
};

export const apiSyncToBaselinker = async (disk: DiskInfo): Promise<ApiResponse<string>> => {
    await new Promise(r => setTimeout(r, 1000));
    return successResponse("BL_" + Math.floor(Math.random() * 100000));
};

// --- ROBUST TEARDOWN LOGIC ---

export const apiCreateTeardownJob = async (title: string, created_by: string, incoming_id: string, incoming_sku: string): Promise<ApiResponse<TeardownJob>> => {
    const { data, error } = await supabase.from('teardown_jobs').insert({ title, created_by, incoming_id, incoming_sku, status: 'pending' }).select().single();
    return error ? errorResponse(error) : successResponse(data as TeardownJob);
};

export const apiGetTeardownJobs = async (): Promise<ApiResponse<TeardownJob[]>> => {
    const { data, error } = await supabase.from('teardown_jobs').select('*').order('created_at', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as TeardownJob[]);
};

export const apiGetTeardownParts = async (jobId: string): Promise<ApiResponse<TeardownPart[]>> => {
    // 1. Try snake_case query (Default for Supabase)
    let { data, error } = await supabase.from('teardown_parts').select('*').eq('job_id', jobId);
    
    // 2. Fallback to camelCase if failed with specific "Column not found" error
    if (error && error.code === 'PGRST100') { // PostgREST error for column missing
        console.warn("Fallback to camelCase column for jobId");
        const fallback = await supabase.from('teardown_parts').select('*').eq('jobId', jobId);
        if (fallback.error) return errorResponse(error); // Return original error if both fail
        data = fallback.data;
    } else if (error) {
        // Return other errors immediately (RLS, etc)
        return errorResponse(error);
    }
    
    return successResponse((data || []).map(mapPartFromDB));
};

export const apiAddTeardownPart = async (part: Partial<TeardownPart>): Promise<ApiResponse<TeardownPart>> => {
    const dbPart = mapPartToDB(part);
    // Explicitly ensure images is text[] compatible for insert
    if (!dbPart.images) dbPart.images = [];
    
    const { data, error } = await supabase.from('teardown_parts').insert(dbPart).select().single();
    if (error) return errorResponse(error);
    return successResponse(mapPartFromDB(data));
};

export const apiUpdateTeardownPart = async (part: Partial<TeardownPart>): Promise<ApiResponse<TeardownPart>> => {
    const dbPart = mapPartToDB(part);
    delete dbPart.id; // Never update primary key
    
    const { data, error } = await supabase.from('teardown_parts').update(dbPart).eq('id', part.id).select().single();
    
    if (error) return errorResponse(error);
    return successResponse(mapPartFromDB(data));
};

export const apiDeleteTeardownPart = async (id: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase.from('teardown_parts').delete().eq('id', id);
    return error ? errorResponse(error) : successResponse(undefined);
};

export const apiGetTeardownCategories = async (): Promise<ApiResponse<TeardownCategory[]>> => {
    const { data, error } = await supabase.from('teardown_categories').select('*');
    return error ? errorResponse(error) : successResponse(data as TeardownCategory[]);
};

export const apiGetTeardownDefinitions = async (categoryId?: number): Promise<ApiResponse<TeardownParamDefinition[]>> => {
    let query = supabase.from('teardown_definitions').select('*');
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data, error } = await query;
    return error ? errorResponse(error) : successResponse(data as TeardownParamDefinition[]);
};

export const apiSaveTeardownDefinition = async (def: Partial<TeardownParamDefinition>): Promise<ApiResponse<TeardownParamDefinition>> => {
    const { data, error } = await supabase.from('teardown_definitions').insert(def).select().single();
    return error ? errorResponse(error) : successResponse(data as TeardownParamDefinition);
};

export const apiUpdateTeardownDefinition = async (def: TeardownParamDefinition): Promise<ApiResponse<TeardownParamDefinition>> => {
    const { data, error } = await supabase.from('teardown_definitions').update(def).eq('id', def.id).select().single();
    return error ? errorResponse(error) : successResponse(data as TeardownParamDefinition);
};

export const apiDeleteTeardownDefinition = async (id: string) => {
    const { error } = await supabase.from('teardown_definitions').delete().eq('id', id);
    return error ? errorResponse(error) : successResponse(undefined);
};

export const apiGetNextTeardownSku = async (): Promise<ApiResponse<string>> => {
    const { data } = await supabase.from('teardown_parts').select('sku').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const lastSku = data?.sku ? parseInt(data.sku) : 9000000000;
    return successResponse((lastSku + 1).toString());
};

export const apiUpdateTeardownCategory = async (id: number, updates: Partial<TeardownCategory>): Promise<ApiResponse<TeardownCategory>> => {
    try {
        const { data, error } = await supabase
            .from('teardown_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) return errorResponse(error);
        return successResponse(data as TeardownCategory);
    } catch (e: any) {
        return errorResponse(e);
    }
};

export const apiUpdateTeardownJobStatus = async (id: string, status: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase.from('teardown_jobs').update({ status }).eq('id', id);
    return error ? errorResponse(error) : successResponse(undefined);
};

// Incoming & Repair
export const apiGetPartsForIncomingItem = async (incomingId: string): Promise<ApiResponse<TeardownPart[]>> => {
    const { data: job } = await supabase.from('teardown_jobs').select('id').eq('incoming_id', incomingId).maybeSingle();
    
    if (!job) return successResponse([]);
    
    // Reuse safe getter
    return apiGetTeardownParts(job.id);
};

export const apiGetLaptopsForTeardown = async (): Promise<ApiResponse<IncomingLaptop[]>> => {
    const { data, error } = await supabase
        .from('incoming_laptops')
        .select('*')
        .eq('status', 'teardown')
        .order('created_at', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as IncomingLaptop[]);
};

export const apiCreateIncomingLaptop = async (laptop: Partial<IncomingLaptop>): Promise<ApiResponse<IncomingLaptop>> => {
    const { data, error } = await supabase.from('incoming_laptops').insert(laptop).select().single();
    return error ? errorResponse(error) : successResponse(data as IncomingLaptop);
};

export const apiGetIncomingLaptops = async (): Promise<ApiResponse<IncomingLaptop[]>> => {
    const { data, error } = await supabase.from('incoming_laptops').select('*').order('created_at', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as IncomingLaptop[]);
};

export const apiGetIncomingLaptopById = async (id: string): Promise<ApiResponse<IncomingLaptop>> => {
    const { data, error } = await supabase.from('incoming_laptops').select('*').eq('id', id).single();
    return error ? errorResponse(error) : successResponse(data as IncomingLaptop);
};

export const apiUpdateIncomingLaptop = async (laptop: IncomingLaptop): Promise<ApiResponse<IncomingLaptop>> => {
    const { data, error } = await supabase.from('incoming_laptops').update(laptop).eq('id', laptop.id).select().single();
    return error ? errorResponse(error) : successResponse(data as IncomingLaptop);
};

export const apiUpdateIncomingStatus = async (id: string, status: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase.from('incoming_laptops').update({ status }).eq('id', id);
    return error ? errorResponse(error) : successResponse(undefined);
};

export const apiGetNextSku = async (): Promise<ApiResponse<string>> => {
    const { data, error } = await supabase.from('incoming_laptops').select('sku').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return errorResponse(error);
    const lastSku = data?.sku ? parseInt(data.sku) : 8000000000;
    return successResponse((lastSku + 1).toString());
};

export const apiAssignTask = async (laptopId: string, userId: string, userName: string, status: string, taskType: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase.from('incoming_laptops').update({ 
        status, 
        assigned_to: userId, 
        location: userName
    }).eq('id', laptopId);
    
    if (!error) {
        await supabase.from('task_timers').insert({
            laptop_id: laptopId,
            task_type: taskType,
            user_id: userId,
            status: 'waiting',
            total_work_seconds: 0
        });
    }
    
    return error ? errorResponse(error) : successResponse(undefined);
};

// Repair Advisor / Jobs
export const apiCreateRepairJob = async (job: Partial<RepairJob>): Promise<ApiResponse<RepairJob>> => {
    const { data, error } = await supabase.from('repair_jobs').insert({ ...job, status: 'pending' }).select().single();
    return error ? errorResponse(error) : successResponse(data as RepairJob);
};

export const apiGetRepairJobs = async (): Promise<ApiResponse<RepairJob[]>> => {
    const { data, error } = await supabase.from('repair_jobs').select('*').order('created_at', { ascending: false });
    return error ? errorResponse(error) : successResponse(data as RepairJob[]);
};

export const apiUpdateRepairJobStatus = async (id: string, status: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase.from('repair_jobs').update({ status }).eq('id', id);
    return error ? errorResponse(error) : successResponse(undefined);
};

export const apiGetAdvisorAnalysis = async (incomingId: string): Promise<ApiResponse<AdvisorAnalysis>> => {
    const { data, error } = await supabase.from('advisor_analysis').select('*').eq('incoming_id', incomingId).maybeSingle();
    return error ? errorResponse(error) : successResponse(data as AdvisorAnalysis);
};

export const apiSaveAdvisorAnalysis = async (analysis: Partial<AdvisorAnalysis>): Promise<ApiResponse<AdvisorAnalysis>> => {
    const { data, error } = await supabase.from('advisor_analysis').upsert(analysis, { onConflict: 'incoming_id' }).select().single();
    return error ? errorResponse(error) : successResponse(data as AdvisorAnalysis);
};

// Timer
export const apiGetActiveTimer = async (laptopId: string, taskType: string): Promise<ApiResponse<TaskTimer>> => {
    const { data, error } = await supabase
        .from('task_timers')
        .select('*')
        .eq('laptop_id', laptopId)
        .eq('task_type', taskType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return error ? errorResponse(error) : successResponse(data as TaskTimer);
};

export const apiUpdateTimerStatus = async (id: string, status: string, updates: Partial<TaskTimer>): Promise<ApiResponse<TaskTimer>> => {
    const { data, error } = await supabase.from('task_timers').update({ status, ...updates }).eq('id', id).select().single();
    return error ? errorResponse(error) : successResponse(data as TaskTimer);
};
