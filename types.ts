
// Core application types for Sitrem Portal

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  department: string;
  username?: string;
  freeDaysAllowance?: number;
  freeDaysUsed?: number;
  deviceId?: string | null;
}

export interface BuybackRequest {
  id: string;
  name: string;
  email: string;
  brand: string;
  model: string;
  specs: string;
  condition: string;
  offered_price: number;
  status: 'pending' | 'contacted' | 'received' | 'completed' | 'cancelled';
  created_at: string;
  data_destruction: boolean;
  description?: string;
  is_manual: boolean;
  photos?: string[];
}

export type CRMStatus = 'new' | 'contacted' | 'negotiating' | 'waiting_device' | 'inspecting' | 'won' | 'lost';

export interface CRMContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  status: CRMStatus;
  source: 'buyback_private' | 'buyback_business' | 'manual' | 'repair' | 'supplier';
  notes?: string;
  created_at: string;
  last_activity?: string;
  privacy_accepted?: boolean;
}

export interface IncomingLaptop {
  id: string;
  sku: string;
  name: string;
  serial_number: string;
  purchase_price: number;
  location: string;
  drive_folder_link?: string;
  photos?: string[]; 
  video_link?: string;
  // Updated statuses to include all flow steps
  status: 'received' | 'diagnostics' | 'service' | 'repair_queue' | 'teardown' | 'wholesale' | 'auction' | 'recycle' | 'ready_for_sale' | 'completed' | 'return';
  source: 'supplier' | 'buyback' | 'private';
  supplier_name?: string;
  client_name?: string; // New field
  origin_details?: string; // New field
  notes?: string;
  specifications?: Record<string, string>;
  created_at: string;
  created_by: string;
  assigned_to?: string;
}

export interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink?: string;
  createdTime: string;
  size: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TimeLog {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  durationMinutes: number;
  status: 'active' | 'completed';
  method: string;
}

export interface DayOffRequest {
  id: string;
  userId: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface ReportEntry {
  projectId: string;
  projectName: string;
  projectColor: string;
  task: string;
  duration: number;
  partsListed?: number;
  laptopsListed?: number;
  laptopsRepaired?: number;
  laptopsDisassembled?: number;
  parcelsPacked?: number;
  partsReceived?: number;
}

export interface Report {
  id: string;
  userId: string;
  date: string;
  summary: string;
  entries: ReportEntry[];
}

export interface ErasureJob {
  id: string;
  clientName: string;
  createdAt: string;
  status: 'pending' | 'completed';
  diskCount: number;
}

export interface DiskInfo {
  id: string;
  jobId: string;
  model: string;
  serialNumber: string;
  capacity: string;
  wipingStatus: 'success' | 'failed';
  baselinkerId?: string;
}

export interface TeardownJob {
  id: string;
  title: string;
  created_at: string;
  status: string;
  created_by?: string;
  incoming_id?: string;
  incoming_sku?: string;
}

export interface TeardownCategory {
  id: number;
  name: string;
  group?: string; 
  baselinker_id?: string;
  naming_template?: string[];
}

export interface TeardownPart {
  id: string;
  jobId: string;
  sku?: string;
  category: string;
  categoryId?: number;
  name: string;
  manufacturer?: string;
  parameters?: Record<string, string>;
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };
  baselinkerId?: string;
  images?: string[]; // Added images array
}

export interface TeardownParamDefinition {
  id?: string;
  category_id: number;
  name: string;
  options: string[];
}

export interface RepairJob {
  id: string;
  model: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  local_parts: any[];
  external_parts: any[];
  total_cost_eur: number;
  incoming_id?: string;
}

export interface AdvisorAnalysis {
  id: string;
  incoming_id: string;
  diagnosis: string;
  steps: string[];
  warnings: string[];
  recommended_parts: any[];
  other_parts: any[];
  missing_parts: any[];
  total_cost_eur: number;
  chosen_action: 'repair' | 'teardown' | 'wholesale' | null;
  updated_at: string;
}

export interface CompanyHoliday {
  id: string;
  date: string;
  name: string;
}

export interface CRMActivity {
  id: string;
  contact_id: string;
  user_id: string;
  type: 'note' | 'email' | 'status_change';
  content: string;
  created_at: string;
}

export interface Terminal {
  id: string;
  name: string;
}

export interface TaskTimer {
  id: string;
  laptop_id: string;
  task_type: string;
  user_id: string;
  created_at: string; // Start of waiting
  work_started_at?: string; // Start of actual work
  last_resume_at?: string;
  total_work_seconds: number;
  is_paused: boolean;
  completed_at?: string;
  status: 'waiting' | 'in_progress' | 'paused' | 'completed';
}
